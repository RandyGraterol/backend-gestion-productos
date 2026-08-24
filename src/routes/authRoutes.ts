import { Router } from 'express';
import {
  registerHandler,
  loginHandler,
  verifyRegistrationHandler,
  resendRegistrationCodeHandler,
  sendVerificationHandler,
  forgotPasswordHandler,
  resetPasswordHandler,
  refreshHandler,
  getCurrentUserHandler,
} from '../controllers/authController';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validator';
import { authLimiter } from '../middleware/rateLimiter';

const router = Router();

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post(
  '/register',
  authLimiter,
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
  authLimiter,
  validate([
    { field: 'email', required: true, type: 'string' },
    { field: 'password', required: true, type: 'string' },
  ]),
  loginHandler
);

/**
 * POST /api/auth/forgot-password
 * Send password reset email
 */
router.post(
  '/forgot-password',
  authLimiter,
  validate([
    { field: 'email', required: true, type: 'string' },
  ]),
  forgotPasswordHandler
);

/**
 * POST /api/auth/reset-password
 * Reset password with token
 */
router.post(
  '/reset-password',
  authLimiter,
  validate([
    { field: 'token', required: true, type: 'string' },
    { field: 'password', required: true, type: 'string', min: 8 },
  ]),
  resetPasswordHandler
);

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', refreshHandler);

/**
 * GET /api/auth/me
 * Get current user (protected route)
 */
router.post(
  '/verify-registration',
  authLimiter,
  validate([
    { field: 'email', required: true, type: 'string' },
    { field: 'code', required: true, type: 'string', pattern: /^\d{6}$/ },
  ]),
  verifyRegistrationHandler
);

router.post(
  '/resend-registration-code',
  authLimiter,
  validate([{ field: 'email', required: true, type: 'string' }]),
  resendRegistrationCodeHandler
);

router.post(
  '/send-verification',
  authenticate,
  sendVerificationHandler
);

router.get('/me', authenticate, getCurrentUserHandler);

export default router;
