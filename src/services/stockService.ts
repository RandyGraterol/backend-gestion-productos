import { Op, Transaction } from 'sequelize';
import { sequelize } from '../config/database';
import { StockMovement, StockMovementItem, Product, User } from '../models';
import { 
  StockMovementHeaderAttributes,
  StockMovementItemAttributes,
  MovementType 
} from '../types';
import { AppError } from '../types';
import { getCachedRates } from './exchangeRateService';

export interface MovementItemInput {
  productId: string;
  quantity: number;
}

export interface CreateMultiMovementData {
  type: MovementType;
  reason?: string;
  reference?: string;
  userId: string;
  items: MovementItemInput[];
}

/**
 * Calculate price totals with currency conversion
 * @param items - Movement items
 * @param exchangeRate - Current exchange rate
 * @param userId - User ID for multi-tenant isolation
 */
const calculateTotals = async (
  items: MovementItemInput[],
  exchangeRate: number,
  userId: string
): Promise<{ totalUSD: number; totalVES: number; itemsWithPrices: any[] }> => {
  const productIds = items.map(i => i.productId);
  const products = await Product.findAll({
    where: { id: productIds, userId },
    attributes: ['id', 'price', 'cost', 'currency', 'stock'],
  });

  const productMap = new Map(products.map(p => [p.id, p]));
  
  let totalUSD = 0;
  let totalVES = 0;
  const itemsWithPrices: any[] = [];

  for (const item of items) {
    const product = productMap.get(item.productId);
    if (!product) {
      throw new AppError(`Product not found: ${item.productId}`, 404);
    }

    const unitPrice = parseFloat(product.price.toString());
    const totalPrice = unitPrice * item.quantity;

    let priceUSD: number;
    let priceVES: number;

    if (product.currency === 'USD') {
      priceUSD = totalPrice;
      priceVES = totalPrice * exchangeRate;
    } else {
      priceVES = totalPrice;
      priceUSD = totalPrice / exchangeRate;
    }

    totalUSD += priceUSD;
    totalVES += priceVES;

    itemsWithPrices.push({
      ...item,
      product,
      unitPrice,
      totalPrice,
      priceUSD,
      priceVES,
    });
  }

  return { totalUSD, totalVES, itemsWithPrices };
};

/**
 * Validate stock availability for 'out' and 'transfer' movements
 * @param items - Movement items
 * @param type - Movement type
 * @param userId - User ID for multi-tenant isolation
 */
const validateStock = async (
  items: MovementItemInput[],
  type: MovementType,
  userId: string
): Promise<void> => {
  const productIds = items.map(i => i.productId);
  const products = await Product.findAll({
    where: { id: productIds, userId },
    attributes: ['id', 'name', 'stock'],
  });

  const productMap = new Map(products.map(p => [p.id, p]));

  for (const item of items) {
    const product = productMap.get(item.productId);
    if (!product) {
      throw new AppError(`Product not found: ${item.productId}`, 404);
    }

    if (type === 'out' || type === 'transfer') {
      if (product.stock < item.quantity) {
        throw new AppError(
          `Insufficient stock for "${product.name}". Current: ${product.stock}, requested: ${item.quantity}`,
          400
        );
      }
    }
  }
};

/**
 * Create a multi-product stock movement with atomic transaction
 * @param movementData - Stock movement creation data with multiple items
 * @returns Created stock movement with items
 */
export const createStockMovement = async (
  movementData: CreateMultiMovementData
): Promise<{ movement: StockMovementHeaderAttributes; items: StockMovementItemAttributes[] }> => {
  const transaction: Transaction = await sequelize.transaction();

  try {
    // Validate stock before proceeding
    await validateStock(movementData.items, movementData.type, movementData.userId);

    // Determine exchange rate: user's custom rate takes priority over API rate
    let exchangeRate = 1;
    try {
      const user = await User.findByPk(movementData.userId, {
        attributes: ['exchangeRateMode', 'customExchangeRate'],
      });
      if (user?.exchangeRateMode === 'manual' && user?.customExchangeRate) {
        exchangeRate = parseFloat(user.customExchangeRate.toString());
      } else {
        // Fall back to cached API rate
        let cached = getCachedRates();
        if (!cached || !cached.official) {
          const { fetchExchangeRates } = await import('./exchangeRateService');
          cached = await fetchExchangeRates(true);
        }
        exchangeRate = cached?.official ?? 1;
      }
    } catch (err) {
      console.warn('[StockService] Could not determine exchange rate, defaulting to 1:', err);
      exchangeRate = 1;
    }

    // Calculate totals with price conversion
    const { totalUSD, totalVES, itemsWithPrices } = await calculateTotals(
      movementData.items,
      exchangeRate,
      movementData.userId
    );

    // Create header movement
    const movement = await StockMovement.create(
      {
        type: movementData.type,
        reason: movementData.reason,
        reference: movementData.reference,
        userId: movementData.userId,
        exchangeRate,
        totalAmountUSD: totalUSD,
        totalAmountVES: totalVES,
        itemCount: movementData.items.length,
      },
      { transaction }
    );

    // Create items and update product stock
    const createdItems: StockMovementItemAttributes[] = [];

    for (const itemData of itemsWithPrices) {
      const product = itemData.product;
      const previousStock = product.stock;
      let newStock = previousStock;

      switch (movementData.type) {
        case 'in':
          newStock = previousStock + itemData.quantity;
          break;
        case 'out':
          newStock = previousStock - itemData.quantity;
          break;
        case 'adjustment':
          if (itemData.quantity === 0) {
            newStock = 0;
          } else {
            newStock = previousStock + itemData.quantity;
          }
          break;
        case 'transfer':
          newStock = previousStock - itemData.quantity;
          break;
        case 'credit':
          // Fiado: stock no se modifica (inventario ya descontado en venta original)
          break;
      }

      // Create movement item
      const item = await StockMovementItem.create(
        {
          movementId: movement.id,
          productId: itemData.productId,
          quantity: itemData.quantity,
          unitPrice: itemData.unitPrice,
          totalPrice: itemData.totalPrice,
          currency: product.currency,
          exchangeRateSnapshot: exchangeRate,
          previousStock,
          newStock,
        },
        { transaction }
      );

      // Update product stock atomically
      await product.update({ stock: newStock }, { transaction });
      itemData.product.stock = newStock;

      createdItems.push(item.toJSON());
    }

    // Commit transaction
    await transaction.commit();

    // Reload movement with relationships
    await movement.reload({
      include: [
        {
          model: StockMovementItem,
          as: 'items',
          include: [
            {
              model: Product,
              as: 'product',
              attributes: ['id', 'sku', 'name', 'unit', 'currency', 'price'],
            },
          ],
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email'],
        },
      ],
    });

    // Send real-time notifications + entity events
    try {
      const { notifyMovementSummary, getIO } = await import('./notificationService');
      await notifyMovementSummary(movementData.userId);

      // Emit real-time entity events for socket listeners
      const io = getIO();
      if (io) {
        // Notify movement list to refresh
        io.to(`user:${movementData.userId}`).emit('movement:created', {
          id: movement.id,
          type: movementData.type,
          itemCount: movementData.items.length,
        });

        // Notify product list to refresh stock values
        for (const item of itemsWithPrices) {
          io.to(`user:${movementData.userId}`).emit('product:updated', {
            id: item.productId,
            stock: item.product.stock,
          });
        }
      }
    } catch {
      // Notification failure shouldn't break the movement
    }

    return {
      movement: movement.toJSON(),
      items: createdItems,
    };
  } catch (error) {
    // Rollback transaction on any error
    await transaction.rollback();
    throw error;
  }
};

/**
 * Get stock movements with filters (header only, items loaded on demand)
 */
export const getStockMovements = async (filters?: {
  userId?: string;
  type?: MovementType;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  limit?: number;
}): Promise<{ data: StockMovementHeaderAttributes[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> => {
  const where: any = {};
  const page = filters?.page || 1;
  const limit = filters?.limit || 20;
  const offset = (page - 1) * limit;

  // Always filter by userId for multi-tenant isolation
  if (filters?.userId) {
    where.userId = filters.userId;
  }

  if (filters?.type) {
    where.type = filters.type;
  }

  // Date range filtering
  if (filters?.dateFrom || filters?.dateTo) {
    where.createdAt = {};
    if (filters.dateFrom) {
      where.createdAt[Op.gte] = filters.dateFrom;
    }
    if (filters.dateTo) {
      where.createdAt[Op.lte] = filters.dateTo;
    }
  }

  const { count, rows } = await StockMovement.findAndCountAll({
    where,
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'email'],
      },
    ],
    order: [['createdAt', 'DESC']],
    limit,
    offset,
  });

  return {
    data: rows.map(movement => movement.toJSON()),
    pagination: {
      page,
      limit,
      total: count,
      totalPages: Math.ceil(count / limit),
    },
  };
};

/**
 * Get stock movement by ID with items
 */
export const getStockMovementById = async (
  id: string,
  userId?: string
): Promise<{ movement: StockMovementHeaderAttributes; items: StockMovementItemAttributes[] }> => {
  const movement = await StockMovement.findOne({
    where: { id, ...(userId ? { userId } : {}) },
    include: [
      {
        model: StockMovementItem,
        as: 'items',
        include: [
          {
            model: Product,
            as: 'product',
            attributes: ['id', 'sku', 'name', 'unit', 'currency', 'price', 'cost'],
          },
        ],
      },
      {
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'email'],
      },
    ],
  });

  if (!movement) {
    throw new AppError('Stock movement not found', 404);
  }

  return {
    movement: movement.toJSON(),
    items: movement.items?.map(item => item.toJSON()) || [],
  };
};

/**
 * Get stock movements for a specific product (via items table)
 */
export const getProductStockHistory = async (
  productId: string,
  limit: number = 50,
  userId?: string
): Promise<StockMovementItemAttributes[]> => {
  // Verificar que el producto pertenezca al tenant
  const product = await Product.findOne({
    where: { id: productId, ...(userId ? { userId } : {}) },
    attributes: ['id'],
  });

  if (!product) {
    throw new AppError('Product not found', 404);
  }

  const items = await StockMovementItem.findAll({
    where: { productId },
    include: [
      {
        model: StockMovement,
        as: 'movement',
        where: userId ? { userId } : {},
        attributes: ['id', 'type', 'reason', 'reference', 'createdAt', 'userId'],
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'name', 'email'],
          },
        ],
      },
    ],
    order: [[{ model: StockMovement, as: 'movement' }, 'createdAt', 'DESC']],
    limit,
  });

  return items.map(item => item.toJSON());
};

/**
 * Delete a stock movement and reverse stock changes
 */
export const deleteStockMovement = async (
  id: string,
  userId: string
): Promise<void> => {
  const transaction: Transaction = await sequelize.transaction();

  try {
    const movement = await StockMovement.findOne({
      where: { id, userId },
      include: [
        {
          model: StockMovementItem,
          as: 'items',
        },
      ],
      transaction,
    });

    if (!movement) {
      throw new AppError('Stock movement not found', 404);
    }

    const items = movement.items || [];

    // Reverse stock changes for each product
    for (const item of items) {
      const product = await Product.findOne({
        where: { id: item.productId, userId },
        transaction,
      });

      if (product) {
        let newStock = product.stock;
        switch (movement.type) {
          case 'in':
            newStock = product.stock - item.quantity;
            break;
          case 'out':
            newStock = product.stock + item.quantity;
            break;
          case 'adjustment':
            newStock = item.previousStock;
            break;
          case 'transfer':
            newStock = product.stock + item.quantity;
            break;
        }
        await product.update({ stock: newStock }, { transaction });
      }
    }

    // Delete items then movement
    await StockMovementItem.destroy({ where: { movementId: id }, transaction });
    await movement.destroy({ transaction });

    await transaction.commit();

    // Emit real-time socket events
    try {
      const { getIO } = await import('./notificationService');
      const io = getIO();
      if (io) {
        io.to(`user:${userId}`).emit('movement:deleted', { id });

        for (const item of items) {
          const product = await Product.findOne({
            where: { id: item.productId, userId },
          });
          if (product) {
            io.to(`user:${userId}`).emit('product:updated', {
              id: product.id,
              stock: product.stock,
            });
          }
        }
      }
    } catch {
      // Notification failure shouldn't break the deletion
    }
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};