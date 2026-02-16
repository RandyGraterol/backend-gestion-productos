import Notification from '../models/Notification';

export interface CreateNotificationData {
  userId: string;
  type: 'stock' | 'expiry' | 'movement' | 'system';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  data?: Record<string, unknown>;
}

/**
 * Get all notifications for a user
 */
export async function getUserNotifications(userId: string, limit: number = 50) {
  try {
    const notifications = await Notification.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
      limit,
    });

    return notifications.map((n) => ({
      id: n.id,
      type: n.type,
      priority: n.priority,
      title: n.title,
      message: n.message,
      read: n.read,
      timestamp: n.createdAt.toISOString(),
      data: n.data ? JSON.parse(n.data) : undefined,
    }));
  } catch (error) {
    console.error('Error getting user notifications:', error);
    throw error;
  }
}

/**
 * Get unread count for a user
 */
export async function getUnreadCount(userId: string): Promise<number> {
  try {
    return await Notification.count({
      where: {
        userId,
        read: false,
      },
    });
  } catch (error) {
    console.error('Error getting unread count:', error);
    throw error;
  }
}

/**
 * Create a notification for a user
 */
export async function createNotification(data: CreateNotificationData) {
  try {
    const notification = await Notification.create({
      userId: data.userId,
      type: data.type,
      priority: data.priority,
      title: data.title,
      message: data.message,
      read: false,
      data: data.data ? JSON.stringify(data.data) : undefined,
    });

    return {
      id: notification.id,
      type: notification.type,
      priority: notification.priority,
      title: notification.title,
      message: notification.message,
      read: notification.read,
      timestamp: notification.createdAt.toISOString(),
      data: notification.data ? JSON.parse(notification.data) : undefined,
    };
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
}

/**
 * Mark a notification as read
 */
export async function markAsRead(notificationId: string, userId: string): Promise<boolean> {
  try {
    const [updated] = await Notification.update(
      { read: true },
      {
        where: {
          id: notificationId,
          userId, // Ensure user owns the notification
        },
      }
    );

    return updated > 0;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllAsRead(userId: string): Promise<number> {
  try {
    const [updated] = await Notification.update(
      { read: true },
      {
        where: {
          userId,
          read: false,
        },
      }
    );

    return updated;
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    throw error;
  }
}

/**
 * Delete a notification
 */
export async function deleteNotification(notificationId: string, userId: string): Promise<boolean> {
  try {
    const deleted = await Notification.destroy({
      where: {
        id: notificationId,
        userId, // Ensure user owns the notification
      },
    });

    return deleted > 0;
  } catch (error) {
    console.error('Error deleting notification:', error);
    throw error;
  }
}

/**
 * Delete all notifications for a user
 */
export async function deleteAllNotifications(userId: string): Promise<number> {
  try {
    const deleted = await Notification.destroy({
      where: { userId },
    });

    return deleted;
  } catch (error) {
    console.error('Error deleting all notifications:', error);
    throw error;
  }
}

/**
 * Create multiple notifications for a user (batch)
 */
export async function createNotifications(
  userId: string,
  notifications: Array<{
    type: 'stock' | 'expiry' | 'movement' | 'system';
    priority: 'low' | 'medium' | 'high' | 'critical';
    title: string;
    message: string;
    data?: Record<string, unknown>;
  }>
) {
  try {
    const created = await Notification.bulkCreate(
      notifications.map((n) => ({
        userId,
        type: n.type,
        priority: n.priority,
        title: n.title,
        message: n.message,
        read: false,
        data: n.data ? JSON.stringify(n.data) : undefined,
      }))
    );

    return created.map((n) => ({
      id: n.id,
      type: n.type,
      priority: n.priority,
      title: n.title,
      message: n.message,
      read: n.read,
      timestamp: n.createdAt.toISOString(),
      data: n.data ? JSON.parse(n.data) : undefined,
    }));
  } catch (error) {
    console.error('Error creating notifications:', error);
    throw error;
  }
}
