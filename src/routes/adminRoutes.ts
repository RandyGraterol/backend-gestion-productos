import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { adminOverviewHandler } from '../controllers/adminController';

const router = Router();

router.get('/overview', authenticate, authorize('admin'), adminOverviewHandler);

export default router;
