import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validator';
import { uploadApk } from '../config/multer';
import {
  listVersionsHandler,
  latestVersionHandler,
  uploadVersionHandler,
  downloadVersionHandler,
  deleteVersionHandler,
  statsHandler,
  requestDownloadCodeHandler,
  verifyDownloadCodeHandler,
} from '../controllers/appVersionController';
import { authLimiter } from '../middleware/rateLimiter';

const router = Router();

/**
 * App Version routes
 * Public: list, latest, download (email verification required)
 * Admin: upload, delete, stats
 */

// Public endpoints (must be declared before parameterized routes)
router.get('/', listVersionsHandler);
router.get('/latest', latestVersionHandler);
router.get('/stats', authenticate, authorize('admin'), statsHandler);

// Email verification flow for downloads (public, rate limited)
router.post(
  '/request-code',
  authLimiter,
  validate([{ field: 'email', required: true, type: 'string' }]),
  requestDownloadCodeHandler
);
router.post(
  '/verify-code',
  authLimiter,
  validate([
    { field: 'email', required: true, type: 'string' },
    { field: 'code', required: true, type: 'string', pattern: /^\d{6}$/ },
  ]),
  verifyDownloadCodeHandler
);

// Download - requires single-use token from email confirmation
router.get('/:id/download', downloadVersionHandler);

// Admin endpoints
router.post(
  '/',
  authenticate,
  authorize('admin'),
  uploadApk.single('file'),
  validate([
    { field: 'version', required: true, type: 'string', pattern: /^\d+\.\d+\.\d+$/ },
    { field: 'releaseName', required: true, type: 'string', min: 3, max: 120 },
    { field: 'releaseNotes', required: true, type: 'string', min: 10 },
  ]),
  uploadVersionHandler
);

router.delete('/:id', authenticate, authorize('admin'), deleteVersionHandler);

export default router;
