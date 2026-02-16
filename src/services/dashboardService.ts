import { Op } from 'sequelize';
import { sequelize } from '../config/database';
import Product from '../models/Product';
import Category from '../models/Category';
import StockMovement from '../models/StockMovement';

/**
 * Dashboard Service
 * Provides statistics and analytics for the dashboard
 */

/**
 * Get general dashboard statistics
 */
export const getDashboardStats = async (dateRange?: { from: Date; to: Date }) => {
  // Total active products
  const totalProducts = await Product.count({ where: { isActive: true } });

  // Products with low stock
  const lowStockCount = await Product.count({
    where: {
      isActive: true,
      stock: { [Op.lt]: sequelize.col('minStock') },
    },
  });

  // Total inventory value
  const products = await Product.findAll({
    where: { isActive: true },
    attributes: ['price', 'stock'],
  });
  const totalValue = products.reduce((sum, p) => sum + p.price * p.stock, 0);

  // Total categories
  const totalCategories = await Category.count();

  // Movement statistics
  const movementWhere: any = {};
  if (dateRange) {
    movementWhere.createdAt = {
      [Op.between]: [dateRange.from, dateRange.to],
    };
  }

  const movements = await StockMovement.findAll({
    where: movementWhere,
    attributes: ['type'],
  });

  const movementStats = {
    total: movements.length,
    entries: movements.filter(m => m.type === 'in').length,
    exits: movements.filter(m => m.type === 'out').length,
    adjustments: movements.filter(m => m.type === 'adjustment').length,
  };

  return {
    totalProducts,
    activeProducts: totalProducts,
    lowStockCount,
    totalValue: parseFloat(totalValue.toFixed(2)),
    totalCategories,
    movements: movementStats,
  };
};

/**
 * Get category statistics with product counts and values
 */
export const getCategoryStats = async () => {
  const results = await sequelize.query(
    `
    SELECT 
      c.id,
      c.name,
      c.icon,
      c.color,
      COUNT(p.id) as productCount,
      COALESCE(SUM(p.stock), 0) as totalStock,
      COALESCE(SUM(p.price * p.stock), 0) as totalValue,
      COALESCE(AVG(p.price), 0) as avgPrice,
      COALESCE(AVG(p.cost), 0) as avgCost,
      COALESCE(AVG(p.price - p.cost), 0) as margin
    FROM categories c
    LEFT JOIN products p ON c.id = p.categoryId AND p.isActive = 1
    GROUP BY c.id, c.name, c.icon, c.color
    HAVING productCount > 0
    ORDER BY totalValue DESC
    `,
    { type: 'SELECT' }
  );

  return results.map((row: any) => ({
    id: row.id,
    name: row.name,
    icon: row.icon,
    color: row.color,
    productCount: parseInt(row.productCount),
    totalStock: parseInt(row.totalStock),
    totalValue: parseFloat(parseFloat(row.totalValue).toFixed(2)),
    avgPrice: parseFloat(parseFloat(row.avgPrice).toFixed(2)),
    avgCost: parseFloat(parseFloat(row.avgCost).toFixed(2)),
    margin: parseFloat(parseFloat(row.margin).toFixed(2)),
    marginPercentage: row.avgCost > 0 
      ? parseFloat(((row.margin / row.avgCost) * 100).toFixed(2))
      : 0,
  }));
};

/**
 * Get stock movement statistics by date
 */
export const getMovementStats = async (days: number = 7) => {
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - days);
  fromDate.setHours(0, 0, 0, 0);

  const results = await sequelize.query(
    `
    SELECT 
      DATE(createdAt) as date,
      SUM(CASE WHEN type = 'in' THEN quantity ELSE 0 END) as entries,
      SUM(CASE WHEN type = 'out' THEN quantity ELSE 0 END) as exits,
      SUM(CASE WHEN type = 'adjustment' THEN ABS(quantity) ELSE 0 END) as adjustments
    FROM stock_movements
    WHERE createdAt >= ?
    GROUP BY DATE(createdAt)
    ORDER BY date ASC
    `,
    {
      replacements: [fromDate.toISOString()],
      type: 'SELECT',
    }
  );

  return results.map((row: any) => ({
    date: row.date,
    entries: parseInt(row.entries),
    exits: parseInt(row.exits),
    adjustments: parseInt(row.adjustments),
  }));
};

/**
 * Get products with low stock
 */
export const getLowStockProducts = async (limit: number = 10) => {
  const results = await sequelize.query(
    `
    SELECT 
      p.id,
      p.name,
      p.sku,
      p.stock,
      p.minStock,
      (p.stock * 100.0 / p.minStock) as percentage,
      c.name as category
    FROM products p
    LEFT JOIN categories c ON p.categoryId = c.id
    WHERE p.isActive = 1 AND p.stock < p.minStock
    ORDER BY percentage ASC
    LIMIT ?
    `,
    {
      replacements: [limit],
      type: 'SELECT',
    }
  );

  return results.map((row: any) => ({
    id: row.id,
    name: row.name,
    sku: row.sku,
    stock: parseInt(row.stock),
    minStock: parseInt(row.minStock),
    percentage: parseFloat(parseFloat(row.percentage).toFixed(2)),
    category: row.category || 'Sin categoría',
  }));
};

/**
 * Get price distribution by category
 */
export const getPriceDistribution = async () => {
  const results = await sequelize.query(
    `
    SELECT 
      c.name as category,
      COALESCE(AVG(p.price), 0) as avgPrice,
      COALESCE(AVG(p.cost), 0) as avgCost,
      COALESCE(AVG(p.price - p.cost), 0) as margin,
      COALESCE(SUM(p.price * p.stock), 0) as totalValue,
      COUNT(p.id) as productCount
    FROM categories c
    LEFT JOIN products p ON c.id = p.categoryId AND p.isActive = 1
    GROUP BY c.id, c.name
    HAVING productCount > 0
    ORDER BY totalValue DESC
    `,
    { type: 'SELECT' }
  );

  return results.map((row: any) => ({
    category: row.category,
    avgPrice: parseFloat(parseFloat(row.avgPrice).toFixed(2)),
    avgCost: parseFloat(parseFloat(row.avgCost).toFixed(2)),
    margin: parseFloat(parseFloat(row.margin).toFixed(2)),
    marginPercentage: row.avgCost > 0
      ? parseFloat(((row.margin / row.avgCost) * 100).toFixed(2))
      : 0,
    totalValue: parseFloat(parseFloat(row.totalValue).toFixed(2)),
    productCount: parseInt(row.productCount),
  }));
};
