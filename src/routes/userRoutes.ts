import { Router } from 'express';
import {
  getAllHandler,
  getByIdHandler,
  updateHandler,
  deactivateHandler,
  createHandler,
  publicCountHandler,
  updateExchangeRateHandler,
} from '../controllers/userController';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validator';
import { authLimiter } from '../middleware/rateLimiter';

const router = Router();

/**
 * GET /api/users/count
 * Public: total registered users (landing page stats)
 */
router.get('/count', authLimiter, publicCountHandler);

/**
 * GET /api/users
 * client: sus operadores · admin: todos
 */
router.get('/', authenticate, authorize('admin', 'client'), getAllHandler);

/**
 * PUT /api/users/exchange-rate
 * Any authenticated user can update their own exchange rate mode
 */
router.put(
  '/exchange-rate',
  authenticate,
  updateExchangeRateHandler
);

/**
 * POST /api/users
 * client: crear operador propio · admin: operador para cualquier cliente
 */
router.post(
  '/',
  authenticate,
  authorize('admin', 'client'),
  validate([
    { field: 'name', required: true, type: 'string', min: 3, max: 100 },
    { field: 'email', required: true, type: 'string' },
    { field: 'password', required: true, type: 'string', min: 8 },
  ]),
  createHandler
);

/**
 * GET /api/users/:id · PUT /api/users/:id · DELETE /api/users/:id
 * client: solo SUS operadores · admin: cualquiera
 */
router.get('/:id', authenticate, authorize('admin', 'client'), getByIdHandler);
router.put(
  '/:id',
  authenticate,
  authorize('admin', 'client'),
  validate([
    { field: 'name', required: false, type: 'string', min: 1, max: 100 },
    { field: 'password', required: false, type: 'string' },
    { field: 'plan', required: false, type: 'string' },
    { field: 'planStatus', required: false, type: 'string' },
    { field: 'planExpiry', required: false, type: 'string' },
  ]),
  updateHandler
);
router.delete('/:id', authenticate, authorize('admin', 'client'), deactivateHandler);

export default router;
