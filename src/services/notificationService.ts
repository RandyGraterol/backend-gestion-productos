import { Op, col } from 'sequelize';
import Product from '../models/Product';
import Category from '../models/Category';

export interface NotificationItem {
  id: string;
  type: 'stock' | 'expiry';
  priority: 'low' | 'medium' | 'high' | 'critical';
  productId: string;
  productName: string;
  productSku: string;
  category: string;
  message: string;
  data: {
    stock?: number;
    minStock?: number;
    percentage?: number;
    expiryDate?: string;
    daysUntilExpiry?: number;
  };
}

/**
 * Get products with low stock
 */
export async function getLowStockProducts(): Promise<NotificationItem[]> {
  try {
    const products = await Product.findAll({
      where: {
        isActive: true,
        stock: {
          [Op.lte]: col('minStock'),
        },
      },
      include: [
        {
          model: Category,
          as: 'category',
          attributes: ['name'],
        },
      ],
      order: [['stock', 'ASC']],
    });

    return products.map((product) => {
      const percentage = product.minStock > 0 
        ? Math.round((product.stock / product.minStock) * 100)
        : 0;

      let priority: 'low' | 'medium' | 'high' | 'critical' = 'medium';
      if (product.stock === 0) {
        priority = 'critical';
      } else if (percentage < 25) {
        priority = 'critical';
      } else if (percentage < 50) {
        priority = 'high';
      } else if (percentage < 75) {
        priority = 'medium';
      }

      const categoryName = (product as any).category?.name || 'Sin categoría';

      return {
        id: `stock_${product.id}`,
        type: 'stock' as const,
        priority,
        productId: product.id,
        productName: product.name,
        productSku: product.sku,
        category: categoryName,
        message: product.stock === 0
          ? `Sin stock disponible`
          : `Stock bajo: ${product.stock} de ${product.minStock} unidades mínimas (${percentage}%)`,
        data: {
          stock: product.stock,
          minStock: product.minStock,
          percentage,
        },
      };
    });
  } catch (error) {
    console.error('Error getting low stock products:', error);
    return [];
  }
}

/**
 * Get products expiring soon
 */
export async function getExpiringProducts(daysThreshold: number = 30): Promise<NotificationItem[]> {
  try {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + daysThreshold);

    const products = await Product.findAll({
      where: {
        isActive: true,
        expiryDate: {
          [Op.gte]: today,
          [Op.lte]: futureDate,
          [Op.ne]: null as any,
        },
      },
      include: [
        {
          model: Category,
          as: 'category',
          attributes: ['name'],
        },
      ],
      order: [['expiryDate', 'ASC']],
    });

    return products.map((product) => {
      const expiryDate = new Date(product.expiryDate!);
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      let priority: 'low' | 'medium' | 'high' | 'critical' = 'medium';
      if (daysUntilExpiry <= 0) {
        priority = 'critical';
      } else if (daysUntilExpiry <= 7) {
        priority = 'critical';
      } else if (daysUntilExpiry <= 15) {
        priority = 'high';
      } else if (daysUntilExpiry <= 30) {
        priority = 'medium';
      }

      const categoryName = (product as any).category?.name || 'Sin categoría';

      let message: string;
      if (daysUntilExpiry <= 0) {
        message = 'Producto vencido';
      } else if (daysUntilExpiry === 1) {
        message = 'Vence mañana';
      } else if (daysUntilExpiry <= 7) {
        message = `Vence en ${daysUntilExpiry} días`;
      } else {
        message = `Vence en ${daysUntilExpiry} días`;
      }

      return {
        id: `expiry_${product.id}`,
        type: 'expiry' as const,
        priority,
        productId: product.id,
        productName: product.name,
        productSku: product.sku,
        category: categoryName,
        message,
        data: {
          expiryDate: product.expiryDate!.toISOString(),
          daysUntilExpiry,
        },
      };
    });
  } catch (error) {
    console.error('Error getting expiring products:', error);
    return [];
  }
}

/**
 * Get all notifications (stock + expiry)
 */
export async function getAllNotifications(expiryDaysThreshold: number = 30): Promise<{
  lowStock: NotificationItem[];
  expiring: NotificationItem[];
  total: number;
}> {
  const [lowStock, expiring] = await Promise.all([
    getLowStockProducts(),
    getExpiringProducts(expiryDaysThreshold),
  ]);

  return {
    lowStock,
    expiring,
    total: lowStock.length + expiring.length,
  };
}

const notificationService = {
  getLowStockProducts,
  getExpiringProducts,
  getAllNotifications,
};

export default notificationService;
