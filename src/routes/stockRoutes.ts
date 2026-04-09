import { Router } from 'express';
import {
  createMovementHandler,
  getMovementsHandler,
  getMovementByIdHandler,
  getProductHistoryHandler,
} from '../controllers/stockController';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validator';

const router = Router();

/**
 * POST /api/stock/movements
 * Create a new stock movement
 */
router.post(
  '/movements',
  authenticate,
  validate([
    { field: 'productId', required: true, type: 'string' },
    { field: 'type', required: true, type: 'string' },
    { field: 'quantity', required: true, type: 'number', min: 1 },
    { field: 'reason', required: false, type: 'string' },
    { field: 'reference', required: false, type: 'string', max: 100 },
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
 * Get stock movement by ID
 */
router.get('/movements/:id', authenticate, getMovementByIdHandler);

/**
 * GET /api/stock/products/:productId/history
 * Get stock history for a specific product
 */
router.get('/products/:productId/history', authenticate, getProductHistoryHandler);

export default router;
