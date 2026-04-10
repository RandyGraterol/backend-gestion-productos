import { Op, Transaction } from 'sequelize';
import { sequelize } from '../config/database';
import { StockMovement, Product, User } from '../models';
import { StockMovementCreationAttributes, StockMovementAttributes, MovementType } from '../types';
import { AppError } from '../types';

/**
 * Create a stock movement with atomic transaction
 * @param movementData - Stock movement creation data
 * @returns Created stock movement with relationships
 */
export const createStockMovement = async (
  movementData: StockMovementCreationAttributes
): Promise<StockMovementAttributes> => {
  // Start a transaction to ensure atomicity
  const transaction: Transaction = await sequelize.transaction();

  try {
    // Get the product with lock to prevent race conditions
    const product = await Product.findByPk(movementData.productId, {
      lock: true,
      transaction,
    });

    if (!product) {
      throw new AppError('Product not found', 404);
    }

    // Calculate new stock based on movement type
    const previousStock = product.stock;
    let newStock = previousStock;

    switch (movementData.type) {
      case 'in':
        newStock = previousStock + movementData.quantity;
        break;
      case 'out':
        newStock = previousStock - movementData.quantity;
        break;
      case 'adjustment':
        // For adjustments, summing the quantity, or replace to exactly 0 if user passes 0
        if (movementData.quantity === 0) {
          newStock = 0;
        } else {
          newStock = previousStock + movementData.quantity;
        }
        break;
      case 'transfer':
        // For transfers, we subtract the quantity
        newStock = previousStock - movementData.quantity;
        break;
    }

    // Prevent negative stock
    if (newStock < 0) {
      throw new AppError(
        `Insufficient stock. Current stock: ${previousStock}, requested: ${movementData.quantity}`,
        400
      );
    }

    // Create stock movement record
    const movement = await StockMovement.create(
      {
        ...movementData,
        previousStock,
        newStock,
      },
      { transaction }
    );

    // Update product stock atomically
    await product.update({ stock: newStock }, { transaction });

    // Commit transaction
    await transaction.commit();

    // Reload movement with relationships
    await movement.reload({
      include: [
        {
          model: Product,
          as: 'product',
          attributes: ['id', 'sku', 'name', 'unit'],
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email'],
        },
      ],
    });

    return movement.toJSON();
  } catch (error) {
    // Rollback transaction on any error
    await transaction.rollback();
    throw error;
  }
};

/**
 * Get stock movements with filters
 * @param filters - Filter options
 * @returns Array of stock movements with relationships
 */
export const getStockMovements = async (filters?: {
  productId?: string;
  userId?: string;
  type?: MovementType;
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
  offset?: number;
}): Promise<StockMovementAttributes[]> => {
  const where: any = {};

  // Apply filters
  if (filters?.productId) {
    where.productId = filters.productId;
  }

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

  const movements = await StockMovement.findAll({
    where,
    include: [
      {
        model: Product,
        as: 'product',
        attributes: ['id', 'sku', 'name', 'unit'],
      },
      {
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'email'],
      },
    ],
    order: [['createdAt', 'DESC']],
    limit: filters?.limit || 100,
    offset: filters?.offset || 0,
  });

  return movements.map(movement => movement.toJSON());
};

/**
 * Get stock movement by ID
 * @param id - Movement ID
 * @returns Stock movement with relationships
 */
export const getStockMovementById = async (id: string): Promise<StockMovementAttributes> => {
  const movement = await StockMovement.findByPk(id, {
    include: [
      {
        model: Product,
        as: 'product',
        attributes: ['id', 'sku', 'name', 'unit'],
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

  return movement.toJSON();
};

/**
 * Get stock movements for a specific product
 * @param productId - Product ID
 * @param limit - Maximum number of movements to return
 * @returns Array of stock movements
 */
export const getProductStockHistory = async (
  productId: string,
  limit: number = 50
): Promise<StockMovementAttributes[]> => {
  const movements = await StockMovement.findAll({
    where: { productId },
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'email'],
      },
    ],
    order: [['createdAt', 'DESC']],
    limit,
  });

  return movements.map(movement => movement.toJSON());
};
