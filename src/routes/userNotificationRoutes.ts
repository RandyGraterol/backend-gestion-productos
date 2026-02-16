import { Router } from 'express';
import * as userNotificationController from '../controllers/userNotificationController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/user-notifications
 * @desc    Get all notifications for the authenticated user
 * @access  Private
 * @query   limit - Number of notifications to return (default: 50)
 */
router.get('/', userNotificationController.getNotifications);

/**
 * @route   GET /api/user-notifications/unread-count
 * @desc    Get unread notification count
 * @access  Private
 */
router.get('/unread-count', userNotificationController.getUnreadCount);

/**
 * @route   PUT /api/user-notifications/:id/read
 * @desc    Mark a notification as read
 * @access  Private
 */
router.put('/:id/read', userNotificationController.markAsRead);

/**
 * @route   PUT /api/user-notifications/read-all
 * @desc    Mark all notifications as read
 * @access  Private
 */
router.put('/read-all', userNotificationController.markAllAsRead);

/**
 * @route   DELETE /api/user-notifications/:id
 * @desc    Delete a notification
 * @access  Private
 */
router.delete('/:id', userNotificationController.deleteNotification);

/**
 * @route   DELETE /api/user-notifications
 * @desc    Delete all notifications
 * @access  Private
 */
router.delete('/', userNotificationController.deleteAllNotifications);

/**
 * @route   POST /api/user-notifications
 * @desc    Create a notification for the authenticated user
 * @access  Private
 */
router.post('/', userNotificationController.createNotification);

/**
 * @route   POST /api/user-notifications/batch
 * @desc    Create multiple notifications (batch)
 * @access  Private
 */
router.post('/batch', userNotificationController.createNotifications);

export default router;
