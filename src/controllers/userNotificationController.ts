import { Request, Response } from 'express';
import * as userNotificationService from '../services/userNotificationService';

/**
 * Get all notifications for the authenticated user
 */
export async function getNotifications(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: 'No autenticado' });
      return;
    }

    const limit = parseInt(req.query.limit as string) || 50;
    const notifications = await userNotificationService.getUserNotifications(userId, limit);

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
 * Get unread count for the authenticated user
 */
export async function getUnreadCount(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: 'No autenticado' });
      return;
    }

    const count = await userNotificationService.getUnreadCount(userId);

    res.json({
      success: true,
      data: { count },
    });
  } catch (error) {
    console.error('Error getting unread count:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener el contador',
    });
  }
}

/**
 * Mark a notification as read
 */
export async function markAsRead(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: 'No autenticado' });
      return;
    }

    const { id } = req.params;
    const updated = await userNotificationService.markAsRead(id, userId);

    if (!updated) {
      res.status(404).json({
        success: false,
        error: 'Notificación no encontrada',
      });
      return;
    }

    res.json({
      success: true,
      message: 'Notificación marcada como leída',
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      error: 'Error al marcar la notificación',
    });
  }
}

/**
 * Mark all notifications as read
 */
export async function markAllAsRead(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: 'No autenticado' });
      return;
    }

    const count = await userNotificationService.markAllAsRead(userId);

    res.json({
      success: true,
      message: `${count} notificaciones marcadas como leídas`,
      data: { count },
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({
      success: false,
      error: 'Error al marcar las notificaciones',
    });
  }
}

/**
 * Delete a notification
 */
export async function deleteNotification(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: 'No autenticado' });
      return;
    }

    const { id } = req.params;
    const deleted = await userNotificationService.deleteNotification(id, userId);

    if (!deleted) {
      res.status(404).json({
        success: false,
        error: 'Notificación no encontrada',
      });
      return;
    }

    res.json({
      success: true,
      message: 'Notificación eliminada',
    });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar la notificación',
    });
  }
}

/**
 * Delete all notifications
 */
export async function deleteAllNotifications(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: 'No autenticado' });
      return;
    }

    const count = await userNotificationService.deleteAllNotifications(userId);

    res.json({
      success: true,
      message: `${count} notificaciones eliminadas`,
      data: { count },
    });
  } catch (error) {
    console.error('Error deleting all notifications:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar las notificaciones',
    });
  }
}

/**
 * Create a notification for the authenticated user
 */
export async function createNotification(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: 'No autenticado' });
      return;
    }

    const { type, priority, title, message, data } = req.body;

    if (!type || !title || !message) {
      res.status(400).json({
        success: false,
        error: 'Faltan campos requeridos: type, title, message',
      });
      return;
    }

    const notification = await userNotificationService.createNotification({
      userId,
      type,
      priority: priority || 'medium',
      title,
      message,
      data,
    });

    res.status(201).json({
      success: true,
      data: notification,
    });
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({
      success: false,
      error: 'Error al crear la notificación',
    });
  }
}

/**
 * Create multiple notifications for the authenticated user (batch)
 */
export async function createNotifications(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: 'No autenticado' });
      return;
    }

    const { notifications } = req.body;

    if (!Array.isArray(notifications) || notifications.length === 0) {
      res.status(400).json({
        success: false,
        error: 'Se requiere un array de notificaciones',
      });
      return;
    }

    const created = await userNotificationService.createNotifications(userId, notifications);

    res.status(201).json({
      success: true,
      data: created,
      message: `${created.length} notificaciones creadas`,
    });
  } catch (error) {
    console.error('Error creating notifications:', error);
    res.status(500).json({
      success: false,
      error: 'Error al crear las notificaciones',
    });
  }
}
