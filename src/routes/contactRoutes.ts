import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validator';
import { authLimiter } from '../middleware/rateLimiter';
import {
  createContactMessageHandler,
  listContactMessagesHandler,
  markMessageHandler,
  deleteContactMessageHandler,
  contactStatsHandler,
} from '../controllers/contactController';

const router = Router();

/**
 * Contact routes
 * Public: submit a message to the developer
 * Admin: list, mark read/unread, delete
 */

// Público
router.post(
  '/',
  authLimiter,
  validate([
    { field: 'name', required: true, type: 'string', min: 2, max: 120 },
    { field: 'email', required: true, type: 'string' },
    { field: 'message', required: true, type: 'string', min: 10, max: 2000 },
  ]),
  createContactMessageHandler
);

// Admin
router.get('/', authenticate, authorize('admin'), listContactMessagesHandler);
router.get('/stats', authenticate, authorize('admin'), contactStatsHandler);
router.patch(
  '/:id/read',
  authenticate,
  authorize('admin'),
  validate([{ field: 'isRead', required: true, type: 'boolean' }]),
  markMessageHandler
);
router.delete('/:id', authenticate, authorize('admin'), deleteContactMessageHandler);

export default router;
