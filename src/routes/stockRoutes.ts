import { Router } from 'express';
import {
  createMovementHandler,
  getMovementsHandler,
  getMovementByIdHandler,
  getProductHistoryHandler,
  deleteMovementHandler,
} from '../controllers/stockController';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validator';

const router = Router();

/**
 * POST /api/stock/movements
 * Create a new multi-product stock movement
 * Body: { type, reason?, reference?, items: [{ productId, quantity }] }
 */
router.post(
  '/movements',
  authenticate,
  validate([
    { field: 'type', required: true, type: 'string' },
    { field: 'reason', required: false, type: 'string' },
    { field: 'reference', required: false, type: 'string', max: 100 },
    { field: 'items', required: true, type: 'array' },
  ]),
  createMovementHandler
);

/**
 * GET /api/stock/movements
 * Get all stock movements with filters
 */
router.get('/movements', authenticate, getMovementsHandler);

/**
 * GET /api/stock/movements/:id
 * Get stock movement by ID with items
 */
router.get('/movements/:id', authenticate, getMovementByIdHandler);

/**
 * DELETE /api/stock/movements/:id
 * Delete a stock movement and reverse stock changes
 */
router.delete('/movements/:id', authenticate, deleteMovementHandler);

/**
 * GET /api/stock/products/:productId/history
 * Get stock history for a specific product
 */
router.get('/products/:productId/history', authenticate, getProductHistoryHandler);

export default router;