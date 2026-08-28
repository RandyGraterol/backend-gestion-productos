import { Response } from 'express';
import { AuthRequest } from '../types';
import * as notificationService from '../services/notificationService';
import { resolveTenantId } from '../utils/tenant';

/**
 * Get all notifications (low stock + expiring products) for the authenticated user
 */
export async function getNotifications(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = resolveTenantId(req.user!);
    if (!userId) {
      res.status(401).json({ success: false, error: 'User authentication required' });
      return;
    }

    const expiryDaysThreshold = parseInt(req.query.expiryDays as string) || 30;
    const notifications = await notificationService.getAllNotifications(userId, expiryDaysThreshold);

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
 * Get low stock notifications only for the authenticated user
 */
export async function getLowStockNotifications(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = resolveTenantId(req.user!);
    if (!userId) {
      res.status(401).json({ success: false, error: 'User authentication required' });
      return;
    }

    const notifications = await notificationService.getLowStockProductsForUser(userId);

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
 * Get expiring products notifications only for the authenticated user
 */
export async function getExpiringNotifications(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = resolveTenantId(req.user!);
    if (!userId) {
      res.status(401).json({ success: false, error: 'User authentication required' });
      return;
    }

    const expiryDaysThreshold = parseInt(req.query.expiryDays as string) || 30;
    const notifications = await notificationService.getExpiringProductsForUser(userId, expiryDaysThreshold);

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
