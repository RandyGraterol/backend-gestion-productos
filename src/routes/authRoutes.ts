import { Router } from 'express';
import { registerHandler, loginHandler, getCurrentUserHandler } from '../controllers/authController';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validator';

const router = Router();

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post(
  '/register',
  validate([
    { field: 'email', required: true, type: 'string', pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
    { field: 'password', required: true, type: 'string', min: 8 },
    { field: 'name', required: true, type: 'string', min: 1, max: 100 },
    { field: 'role', required: false, type: 'string' },
    { field: 'avatar', required: false, type: 'string' },
  ]),
  registerHandler
);

/**
 * POST /api/auth/login
 * Login user
 */
router.post(
  '/login',
  validate([
    { field: 'email', required: true, type: 'string' },
    { field: 'password', required: true, type: 'string' },
  ]),
  loginHandler
);

/**
 * GET /api/auth/me
 * Get current user (protected route)
 */
router.get('/me', authenticate, getCurrentUserHandler);

export default router;
