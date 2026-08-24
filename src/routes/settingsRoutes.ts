import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import {
  getImageStorageHandler,
  updateImageStorageHandler,
} from '../controllers/settingsController';

const router = Router();

// Solo administrador
router.get(
  '/image-storage',
  authenticate,
  authorize('admin'),
  getImageStorageHandler
);

router.put(
  '/image-storage',
  authenticate,
  authorize('admin'),
  updateImageStorageHandler
);

export default router;
