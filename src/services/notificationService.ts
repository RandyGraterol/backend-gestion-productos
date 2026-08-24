/**
 * NotificationService - Real-time notifications via Socket.io
 *
 * Emits events for:
 * - Low stock alerts
 * - Expiring products
 * - Product movement summaries
 * - Top/least sold products
 */

import { Server as SocketServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import Product from '../models/Product';
import StockMovement from '../models/StockMovement';
import { Op, col } from 'sequelize';

export interface AppNotification {
  id: string;
  type: 'low_stock' | 'expiring' | 'movement_summary' | 'top_product' | 'category_alert' | 'info';
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'error' | 'success';
  data?: Record<string, unknown>;
  createdAt: string;
}

let io: SocketServer | null = null;

/**
 * Initialize Socket.io server
 */
export function initSocket(httpServer: HttpServer): SocketServer {
  io = new SocketServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    // Join a room based on userId
    socket.on('join', (userId: string) => {
      socket.join(`user:${userId}`);
      console.log(`👤 User ${userId} joined room`);
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);
    });
  });

  console.log('📡 Socket.io initialized');
  return io;
}

/**
 * Get the Socket.io instance
 */
export function getIO(): SocketServer | null {
  return io;
}

/**
 * Emit notification to a specific user
 */
export function emitToUser(userId: string, notification: AppNotification) {
  if (!io) return;
  io.to(`user:${userId}`).emit('notification', notification);
}

/**
 * Emit to all connected clients
 */
export function emitToAll(notification: AppNotification) {
  if (!io) return;
  io.emit('notification', notification);
}

// ============================================
// NOTIFICATION CHECKERS
// ============================================

let checkInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Start periodic notification checks (every 60 seconds)
 */
export function startNotificationChecks() {
  if (checkInterval) return;

  console.log('🔔 Starting notification checks (every 60s)');
  checkInterval = setInterval(async () => {
    try {
      await checkLowStock();
      await checkExpiringProducts();
    } catch (error) {
      console.error('Error in notification check:', error);
    }
  }, 60000);

  // Run immediately on start
  setTimeout(async () => {
    try {
      await checkLowStock();
      await checkExpiringProducts();
    } catch (error) {
      console.error('Error in initial notification check:', error);
    }
  }, 5000);
}

/**
 * Stop notification checks
 */
export function stopNotificationChecks() {
  if (checkInterval) {
    clearInterval(checkInterval);
    checkInterval = null;
  }
}

/**
 * Check for low stock products and notify
 */
async function checkLowStock() {
  try {
    const products = await Product.findAll({
      where: {
        isActive: true,
        stock: { [Op.lte]: col('minStock') },
      },
      attributes: ['id', 'name', 'stock', 'minStock', 'userId'],
    });

    for (const product of products) {
      const notif: AppNotification = {
        id: `low_stock_${product.id}_${Date.now()}`,
        type: 'low_stock',
        title: 'Stock bajo',
        message: `"${product.name}" tiene ${product.stock} unidades (mínimo: ${product.minStock})`,
        severity: product.stock === 0 ? 'error' : 'warning',
        data: { productId: product.id, stock: product.stock, minStock: product.minStock },
        createdAt: new Date().toISOString(),
      };
      emitToUser(product.userId, notif);
    }
  } catch (error) {
    console.error('Error checking low stock:', error);
  }
}

/**
 * Check for expiring products (within 7 days) and notify
 */
async function checkExpiringProducts() {
  try {
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const products = await Product.findAll({
      where: {
        isActive: true,
        expiryDate: {
          [Op.lte]: sevenDaysFromNow,
          [Op.gte]: now,
        },
      },
      attributes: ['id', 'name', 'expiryDate', 'userId'],
    });

    for (const product of products) {
      const expiryDate = new Date(product.expiryDate!);
      const daysLeft = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      const notif: AppNotification = {
        id: `expiring_${product.id}_${Date.now()}`,
        type: 'expiring',
        title: 'Producto por vencer',
        message: `"${product.name}" vence en ${daysLeft} día${daysLeft !== 1 ? 's' : ''}`,
        severity: daysLeft <= 2 ? 'error' : 'warning',
        data: { productId: product.id, expiryDate: product.expiryDate, daysLeft },
        createdAt: new Date().toISOString(),
      };
      emitToUser(product.userId, notif);
    }
  } catch (error) {
    console.error('Error checking expiring products:', error);
  }
}

/**
 * Generate movement summary notification (called after stock movements)
 */
export async function notifyMovementSummary(userId: string) {
  try {
    // Get today's movements count
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayCount = await StockMovement.count({
      where: {
        userId,
        createdAt: { [Op.gte]: today },
      },
    });

    if (todayCount > 0) {
      const entries = await StockMovement.count({
        where: {
          userId,
          type: 'in',
          createdAt: { [Op.gte]: today },
        },
      });

      const exits = await StockMovement.count({
        where: {
          userId,
          type: 'out',
          createdAt: { [Op.gte]: today },
        },
      });

      const notif: AppNotification = {
        id: `movement_summary_${Date.now()}`,
        type: 'movement_summary',
        title: 'Resumen de hoy',
        message: `${todayCount} movimiento${todayCount !== 1 ? 's' : ''}: ${entries} entrada${entries !== 1 ? 's' : ''}, ${exits} salida${exits !== 1 ? 's' : ''}`,
        severity: 'info',
        data: { todayCount, entries, exits },
        createdAt: new Date().toISOString(),
      };
      emitToUser(userId, notif);
    }
  } catch (error) {
    console.error('Error sending movement summary:', error);
  }
}

/**
 * Notify when a product is created
 */
export function notifyProductCreated(userId: string, productName: string) {
  const notif: AppNotification = {
    id: `product_created_${Date.now()}`,
    type: 'info',
    title: 'Producto creado',
    message: `"${productName}" se agregó al inventario`,
    severity: 'success',
    createdAt: new Date().toISOString(),
  };
  emitToUser(userId, notif);
}

/**
 * Notify when a category alert triggers
 */
export function notifyCategoryAlert(userId: string, categoryName: string, productCount: number) {
  const notif: AppNotification = {
    id: `category_alert_${Date.now()}`,
    type: 'category_alert',
    title: 'Categoría',
    message: `"${categoryName}" tiene ${productCount} producto${productCount !== 1 ? 's' : ''}`,
    severity: 'info',
    data: { categoryName, productCount },
    createdAt: new Date().toISOString(),
  };
  emitToUser(userId, notif);
}

// ============================================
// REST API NOTIFICATION QUERIES
// ============================================

/**
 * Get all notifications (low stock + expiring products)
 */
export async function getAllNotifications(expiryDaysThreshold: number = 30): Promise<AppNotification[]> {
  const lowStock = await getLowStockProducts();
  const expiring = await getExpiringProducts(expiryDaysThreshold);
  return [...lowStock, ...expiring].sort((a, b) => {
    const severityOrder = { error: 0, warning: 1, info: 2, success: 3 };
    return (severityOrder[a.severity] ?? 4) - (severityOrder[b.severity] ?? 4);
  });
}

/**
 * Get low stock products as notifications
 */
export async function getLowStockProducts(): Promise<AppNotification[]> {
  const products = await Product.findAll({
    where: {
      isActive: true,
      stock: { [Op.lte]: col('minStock') },
    },
    attributes: ['id', 'name', 'stock', 'minStock', 'userId'],
  });

  return products.map((p) => ({
    id: `low_stock_rest_${p.id}`,
    type: 'low_stock' as const,
    title: 'Stock bajo',
    message: `"${p.name}" tiene ${p.stock} unidades (mínimo: ${p.minStock})`,
    severity: p.stock === 0 ? 'error' as const : 'warning' as const,
    data: { productId: p.id, stock: p.stock, minStock: p.minStock },
    createdAt: new Date().toISOString(),
  }));
}

/**
 * Get expiring products as notifications
 */
export async function getExpiringProducts(expiryDaysThreshold: number = 30): Promise<AppNotification[]> {
  const now = new Date();
  const threshold = new Date(now.getTime() + expiryDaysThreshold * 24 * 60 * 60 * 1000);

  const products = await Product.findAll({
    where: {
      isActive: true,
      expiryDate: {
        [Op.lte]: threshold,
        [Op.gte]: now,
      },
    },
    attributes: ['id', 'name', 'expiryDate', 'userId'],
  });

  return products.map((p) => {
    const expiryDate = new Date(p.expiryDate!);
    const daysLeft = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return {
      id: `expiring_rest_${p.id}`,
      type: 'expiring' as const,
      title: 'Producto por vencer',
      message: `"${p.name}" vence en ${daysLeft} día${daysLeft !== 1 ? 's' : ''}`,
      severity: daysLeft <= 2 ? 'error' as const : 'warning' as const,
      data: { productId: p.id, expiryDate: p.expiryDate, daysLeft },
      createdAt: new Date().toISOString(),
    };
  });
}
