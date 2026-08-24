import { Router } from 'express';
import {
  getAllHandler,
  getStatsHandler,
  updateStatusHandler,
  deleteHandler,
} from '../controllers/membershipPaymentController';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';

const router = Router();

/**
 * GET /api/admin/membership-payments
 * Get all membership payments (admin only)
 */
router.get('/', authenticate, authorize(['admin']), getAllHandler);

/**
 * GET /api/admin/membership-payments/stats
 * Get payment statistics (admin only)
 */
router.get('/stats', authenticate, authorize(['admin']), getStatsHandler);

/**
 * PUT /api/admin/membership-payments/:id/status
 * Update payment status (admin only)
 */
router.put('/:id/status', authenticate, authorize(['admin']), updateStatusHandler);

/**
 * DELETE /api/admin/membership-payments/:id
 * Delete a payment (admin only)
 */
router.delete('/:id', authenticate, authorize(['admin']), deleteHandler);

export default router;
