import { Op } from 'sequelize';
import { sequelize } from '../config/database';
import Product from '../models/Product';
import Category from '../models/Category';
import StockMovement from '../models/StockMovement';
import { getCachedRates } from './exchangeRateService';

/**
 * Dashboard Service
 * Provides statistics and analytics for the dashboard — filtered by userId
 */

/**
 * Get general dashboard statistics for a specific user
 */
export const getDashboardStats = async (userId: string, dateRange?: { from: Date; to: Date }) => {
  // Total active products for this user
  const totalProducts = await Product.count({ where: { userId, isActive: true } });

  // Products with low stock (stock < minStock) for this user
  const lowStockCount = await Product.count({
    where: {
      userId,
      isActive: true,
      stock: { [Op.lt]: sequelize.col('minStock') },
    },
  });

  // Products out of stock for this user
  const outOfStockCount = await Product.count({
    where: { userId, isActive: true, stock: 0 },
  });

  // Total inventory value for this user (broken down by currency)
  const products = await Product.findAll({
    where: { userId, isActive: true },
    attributes: ['price', 'stock', 'cost', 'currency'],
  });
  const rawInventoryValueUSD = products
    .filter(p => p.currency === 'USD')
    .reduce((sum, p) => sum + Number(p.price) * Number(p.stock), 0);
  const rawInventoryValueVES = products
    .filter(p => p.currency === 'VES')
    .reduce((sum, p) => sum + Number(p.price) * Number(p.stock), 0);

  // Convert USD to VES using official rate for display
  const rates = getCachedRates();
  const officialRate = rates?.official ?? 1;
  const inventoryValueUSD = rawInventoryValueUSD;
  // VES display = native VES + USD converted to VES
  const inventoryValueVES = rawInventoryValueVES + rawInventoryValueUSD * officialRate;
  const totalValue = inventoryValueUSD + inventoryValueVES;
  const potentialProfit = products.reduce((sum, p) => sum + (Number(p.price) - Number(p.cost)) * Number(p.stock), 0);

  // Total categories for this user
  const totalCategories = await Category.count({ where: { userId } });

  // Recent movements for this user (last 7 days)
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const recentMovements = await StockMovement.count({
    where: { userId, createdAt: { [Op.gte]: weekAgo } },
  });

  // Today's movements for this user
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayMovements = await StockMovement.count({
    where: { userId, createdAt: { [Op.gte]: todayStart } },
  });

  // Expiring products for this user (within 7 days)
  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
  const expiringCount = await Product.count({
    where: {
      userId,
      isActive: true,
      expiryDate: { [Op.between]: [new Date(), sevenDaysFromNow] },
    },
  });

  // Movement statistics within date range
  const movementWhere: any = { userId };
  if (dateRange) {
    movementWhere.createdAt = { [Op.between]: [dateRange.from, dateRange.to] };
  }

  const movements = await StockMovement.findAll({
    where: movementWhere,
    attributes: ['type', 'totalAmountUSD', 'totalAmountVES'],
  });

  const movementStats = {
    total: movements.length,
    entries: movements.filter(m => m.type === 'in').length,
    exits: movements.filter(m => m.type === 'out').length,
    adjustments: movements.filter(m => m.type === 'adjustment').length,
  };

  // Total sold: sum of totalAmountUSD/VES from movements of type 'out'
  const outMovements = movements.filter(m => m.type === 'out');
  const rawTotalSoldUSD = outMovements.reduce((sum, m) => sum + Number(m.totalAmountUSD || 0), 0);
  const rawTotalSoldVES = outMovements.reduce((sum, m) => sum + Number(m.totalAmountVES || 0), 0);
  // VES display = native VES + USD converted to VES
  const totalSoldUSD = rawTotalSoldUSD;
  const totalSoldVES = rawTotalSoldVES + rawTotalSoldUSD * officialRate;

  return {
    totalProducts,
    activeProducts: totalProducts,
    lowStockCount,
    outOfStockCount,
    inventoryValueUSD: parseFloat(inventoryValueUSD.toFixed(2)),
    inventoryValueVES: parseFloat(inventoryValueVES.toFixed(2)),
    totalStockValue: parseFloat(totalValue.toFixed(2)),
    totalValue: parseFloat(totalValue.toFixed(2)),
    potentialProfit: parseFloat(potentialProfit.toFixed(2)),
    totalSoldUSD: parseFloat(totalSoldUSD.toFixed(2)),
    totalSoldVES: parseFloat(totalSoldVES.toFixed(2)),
    totalCategories,
    recentMovements,
    todayMovements,
    expiringCount,
    movements: movementStats,
  };
};

/**
 * Get category statistics for a specific user
 */
export const getCategoryStats = async (userId: string) => {
  const results = await sequelize.query(
    `
    SELECT 
      c."id",
      c."name",
      COALESCE(c."icon", '') as "icon",
      COALESCE(c."color", '#3B82F6') as "color",
      COUNT(p."id")::int as "productCount",
      COALESCE(SUM(p."stock"), 0)::int as "totalStock",
      COALESCE(SUM(p."price" * p."stock"), 0) as "totalValue"
    FROM "categories" c
    LEFT JOIN "products" p ON p."categoryId" = c."id" AND p."isActive" = true AND p."deletedAt" IS NULL
    WHERE c."userId" = :userId AND c."deletedAt" IS NULL
    GROUP BY c."id", c."name", c."icon", c."color"

    UNION ALL

    SELECT 
      md5('sin-categoria' || :userId)::uuid as "id",
      'Sin categoría' as "name",
      '' as "icon",
      '#94A3B8' as "color",
      COUNT(p."id")::int as "productCount",
      COALESCE(SUM(p."stock"), 0)::int as "totalStock",
      COALESCE(SUM(p."price" * p."stock"), 0) as "totalValue"
    FROM "products" p
    WHERE p."userId" = :userId AND p."deletedAt" IS NULL 
      AND p."isActive" = true AND (p."categoryId" IS NULL
        OR p."categoryId" IN (SELECT id FROM categories WHERE "deletedAt" IS NOT NULL))
    HAVING COUNT(p."id") > 0

    ORDER BY "productCount" DESC
    `,
    { replacements: { userId }, type: 'SELECT' }
  );

  return results.map((row: any) => ({
    id: row.id,
    name: row.name,
    icon: row.icon,
    color: row.color,
    productCount: parseInt(row.productCount),
    totalStock: parseInt(row.totalStock),
    totalValue: parseFloat(parseFloat(row.totalValue).toFixed(2)),
  }));
};

/**
 * Get stock movement statistics by date for a specific user
 * Uses stock_movement_items for quantity data (multi-product structure)
 */
export const getMovementStats = async (userId: string, days: number = 7) => {
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - days);
  fromDate.setHours(0, 0, 0, 0);

  const results = await sequelize.query(
    `
    SELECT
      DATE(sm."createdAt") as "date",
      COUNT(DISTINCT sm."id") as "count",
      COALESCE(SUM(CASE WHEN sm."type" = 'in' THEN si."quantity" ELSE 0 END), 0) as "entries",
      COALESCE(SUM(CASE WHEN sm."type" = 'out' THEN si."quantity" ELSE 0 END), 0) as "exits",
      COALESCE(SUM(CASE WHEN sm."type" = 'adjustment' THEN ABS(si."quantity") ELSE 0 END), 0) as "adjustments"
    FROM "stock_movements" sm
    INNER JOIN "stock_movement_items" si ON si."movementId" = sm."id"
    WHERE sm."createdAt" >= :fromDate AND sm."userId" = :userId
    GROUP BY DATE(sm."createdAt")
    ORDER BY "date" ASC
    `,
    { replacements: { fromDate: fromDate.toISOString(), userId }, type: 'SELECT' }
  );

  return results.map((row: any) => ({
    date: row.date,
    count: parseInt(row.count),
    entries: parseInt(row.entries),
    exits: parseInt(row.exits),
    adjustments: parseInt(row.adjustments),
  }));
};

/**
 * Get products with low stock for a specific user
 */
export const getLowStockProducts = async (userId: string, limit: number = 10) => {
  const products = await Product.findAll({
    where: {
      userId,
      isActive: true,
      stock: { [Op.lt]: sequelize.col('minStock') },
    },
    include: [{ model: Category, as: 'category', attributes: ['id', 'name'] }],
    order: [['stock', 'ASC']],
    limit,
  });

  return products.map(p => p.toJSON());
};

/**
 * Get top products by stock for a specific user
 */
export const getTopProducts = async (userId: string, limit: number = 5) => {
  const products = await Product.findAll({
    where: { userId, isActive: true },
    include: [{ model: Category, as: 'category', attributes: ['id', 'name'] }],
    order: [['stock', 'DESC']],
    limit,
  });

  return products.map(p => p.toJSON());
};

/**
 * Get price distribution by category for a specific user
 */
export const getPriceDistribution = async (userId: string) => {
  const results = await sequelize.query(
    `
    SELECT 
      c."name" as "category",
      COALESCE(AVG(p."price"), 0) as "avgPrice",
      COALESCE(SUM(p."price" * p."stock"), 0) as "totalValue",
      COUNT(p."id") as "productCount"
    FROM "categories" c
    LEFT JOIN "products" p ON p."categoryId" = c."id" AND p."isActive" = true AND p."deletedAt" IS NULL
    WHERE c."userId" = :userId AND c."deletedAt" IS NULL
    GROUP BY c."id", c."name"
    HAVING COUNT(p."id") > 0
    ORDER BY "totalValue" DESC
    `,
    { replacements: { userId }, type: 'SELECT' }
  );

  return results.map((row: any) => ({
    category: row.category,
    avgPrice: parseFloat(parseFloat(row.avgPrice).toFixed(2)),
    totalValue: parseFloat(parseFloat(row.totalValue).toFixed(2)),
    productCount: parseInt(row.productCount),
  }));
};

/**
 * Get top selling products for a specific user
 */
export const getTopSellingProducts = async (userId: string, limit: number = 5) => {
  const results = await sequelize.query(
    `
    SELECT 
      p."id",
      p."name",
      p."sku",
      p."stock",
      c."name" as "category"
    FROM "products" p
    LEFT JOIN "categories" c ON c."deletedAt" IS NULL AND p."categoryId" = c."id"
    WHERE p."userId" = :userId AND p."isActive" = true AND p."deletedAt" IS NULL
    ORDER BY p."stock" DESC
    LIMIT :limit
    `,
    { replacements: { userId, limit }, type: 'SELECT' }
  );

  return results.map((row: any) => ({
    id: row.id,
    name: row.name,
    sku: row.sku,
    stock: parseInt(row.stock),
    category: row.category || 'Sin categoría',
  }));
};

/**
 * Get profit stats for a specific user
 * Uses stock_movement_items for quantity and product data (multi-product structure)
 */
export const getProfitStats = async (userId: string, days: number = 7) => {
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - days);
  fromDate.setHours(0, 0, 0, 0);

  const results = await sequelize.query(
    `
    SELECT
      DATE(sm."createdAt") as "date",
      SUM(si."totalPrice") as "revenue",
      SUM(si."quantity" * p."cost") as "costs",
      SUM(si."totalPrice" - si."quantity" * p."cost") as "profit"
    FROM "stock_movements" sm
    INNER JOIN "stock_movement_items" si ON si."movementId" = sm."id"
    INNER JOIN "products" p ON si."productId" = p."id"
    WHERE sm."createdAt" >= :fromDate AND sm."type" = 'out' AND sm."userId" = :userId
    GROUP BY DATE(sm."createdAt")
    ORDER BY "date" ASC
    `,
    { replacements: { fromDate: fromDate.toISOString(), userId }, type: 'SELECT' }
  );

  return results.map((row: any) => ({
    date: row.date,
    revenue: parseFloat(parseFloat(row.revenue || 0).toFixed(2)),
    costs: parseFloat(parseFloat(row.costs || 0).toFixed(2)),
    profit: parseFloat(parseFloat(row.profit || 0).toFixed(2)),
  }));
};
