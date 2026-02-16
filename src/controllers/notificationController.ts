import { Request, Response } from 'express';
import * as notificationService from '../services/notificationService';

/**
 * Get all notifications (low stock + expiring products)
 */
export async function getNotifications(req: Request, res: Response): Promise<void> {
  try {
    const expiryDaysThreshold = parseInt(req.query.expiryDays as string) || 30;

    const notifications = await notificationService.getAllNotifications(expiryDaysThreshold);

    res.json({
      success: true,
      data: notifications,
    });
  } catch (error) {
    console.error('Error getting notifications:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener las notificaciones',
    });
  }
}

/**
 * Get low stock notifications only
 */
export async function getLowStockNotifications(_req: Request, res: Response): Promise<void> {
  try {
    const notifications = await notificationService.getLowStockProducts();

    res.json({
      success: true,
      data: notifications,
    });
  } catch (error) {
    console.error('Error getting low stock notifications:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener las notificaciones de stock bajo',
    });
  }
}

/**
 * Get expiring products notifications only
 */
export async function getExpiringNotifications(req: Request, res: Response): Promise<void> {
  try {
    const expiryDaysThreshold = parseInt(req.query.expiryDays as string) || 30;
    const notifications = await notificationService.getExpiringProducts(expiryDaysThreshold);

    res.json({
      success: true,
      data: notifications,
    });
  } catch (error) {
    console.error('Error getting expiring notifications:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener las notificaciones de vencimiento',
    });
  }
}
