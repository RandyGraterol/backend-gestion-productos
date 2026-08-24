import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validator';
import { authLimiter } from '../middleware/rateLimiter';
import { uploadDonationScreenshot } from '../config/multer';
import {
  listActiveMethodsHandler,
  createDonationHandler,
  listAllMethodsHandler,
  createMethodHandler,
  updateMethodHandler,
  deleteMethodHandler,
  listDonationsHandler,
  setDonationStatusHandler,
  deleteDonationHandler,
  donationStatsHandler,
  downloadLogsHandler,
  downloadLogStatsHandler,
} from '../controllers/donationController';

const router = Router();

const METHOD_TYPES = ['pago_movil', 'transferencia', 'binance', 'correo', 'otro'];
const DONATION_STATUSES = ['pendiente', 'revisada', 'rechazada'];

/**
 * Donation routes
 * Public: active methods, submit donation receipt
 * Admin: manage methods, review donations, download logs
 */

// ---------- Públicos ----------
router.get('/methods', listActiveMethodsHandler);

router.post(
  '/',
  authLimiter,
  uploadDonationScreenshot.single('screenshot'),
  validate([
    { field: 'donorEmail', required: true, type: 'string' },
    { field: 'comment', required: true, type: 'string', min: 5, max: 1000 },
  ]),
  createDonationHandler
);

// ---------- Admin: métodos de pago ----------
router.get('/methods/all', authenticate, authorize('admin'), listAllMethodsHandler);

router.post(
  '/methods',
  authenticate,
  authorize('admin'),
  validate([
    { field: 'type', required: true, type: 'string', custom: (v) => METHOD_TYPES.includes(v) || 'Tipo inválido' },
    { field: 'title', required: true, type: 'string', min: 3, max: 120 },
    { field: 'details', required: true, type: 'string', min: 3 },
  ]),
  createMethodHandler
);

router.put(
  '/methods/:id',
  authenticate,
  authorize('admin'),
  validate([
    { field: 'type', type: 'string', custom: (v) => v === undefined || METHOD_TYPES.includes(v) || 'Tipo inválido' },
    { field: 'title', type: 'string', min: 3, max: 120 },
    { field: 'details', type: 'string', min: 3 },
  ]),
  updateMethodHandler
);

router.delete('/methods/:id', authenticate, authorize('admin'), deleteMethodHandler);

// ---------- Admin: donaciones ----------
router.get('/', authenticate, authorize('admin'), listDonationsHandler);
router.get('/stats', authenticate, authorize('admin'), donationStatsHandler);

router.patch(
  '/:id/status',
  authenticate,
  authorize('admin'),
  validate([
    {
      field: 'status',
      required: true,
      type: 'string',
      custom: (v) => DONATION_STATUSES.includes(v) || 'Estado inválido',
    },
  ]),
  setDonationStatusHandler
);

router.delete('/:id', authenticate, authorize('admin'), deleteDonationHandler);

// ---------- Admin: log de descargas ----------
router.get('/downloads/log', authenticate, authorize('admin'), downloadLogsHandler);
router.get('/downloads/stats', authenticate, authorize('admin'), downloadLogStatsHandler);

export default router;
