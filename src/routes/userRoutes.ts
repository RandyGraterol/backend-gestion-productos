import { Router } from 'express';
import {
  getAllHandler,
  getByIdHandler,
  updateHandler,
  deactivateHandler,
} from '../controllers/userController';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validator';

const router = Router();

/**
 * GET /api/users
 * Get all users (admin only)
 */
router.get('/', authenticate, authorize('admin'), getAllHandler);

/**
 * GET /api/users/:id
 * Get user by ID (admin only)
 */
router.get('/:id', authenticate, authorize('admin'), getByIdHandler);

/**
 * PUT /api/users/:id
 * Update user (admin only)
 */
router.put(
  '/:id',
  authenticate,
  authorize('admin'),
  validate([
    { field: 'email', required: false, type: 'string' },
    { field: 'name', required: false, type: 'string', min: 1, max: 100 },
    { field: 'role', required: false, type: 'string' },
    { field: 'avatar', required: false, type: 'string', max: 500 },
    { field: 'isActive', required: false, type: 'boolean' },
  ]),
  updateHandler
);

/**
 * DELETE /api/users/:id
 * Deactivate user (admin only)
 */
router.delete('/:id', authenticate, authorize('admin'), deactivateHandler);

export default router;
