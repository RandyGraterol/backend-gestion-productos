import { Router } from 'express';
import * as notificationController from '../controllers/notificationController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/notifications
 * @desc    Get all notifications (low stock + expiring products)
 * @access  Private
 * @query   expiryDays - Days threshold for expiry notifications (default: 30)
 */
router.get('/', notificationController.getNotifications);

/**
 * @route   GET /api/notifications/low-stock
 * @desc    Get low stock notifications only
 * @access  Private
 */
router.get('/low-stock', notificationController.getLowStockNotifications);

/**
 * @route   GET /api/notifications/expiring
 * @desc    Get expiring products notifications only
 * @access  Private
 * @query   expiryDays - Days threshold for expiry notifications (default: 30)
 */
router.get('/expiring', notificationController.getExpiringNotifications);

export default router;
