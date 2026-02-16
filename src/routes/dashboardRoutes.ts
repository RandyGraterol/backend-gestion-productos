import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getStatsHandler,
  getCategoryStatsHandler,
  getMovementStatsHandler,
  getLowStockHandler,
  getPriceDistributionHandler,
} from '../controllers/dashboardController';

const router = Router();

/**
 * Dashboard Routes
 * All routes require authentication
 */

// GET /api/dashboard/stats - Get general dashboard statistics
router.get('/stats', authenticate, getStatsHandler);

// GET /api/dashboard/categories - Get category statistics
router.get('/categories', authenticate, getCategoryStatsHandler);

// GET /api/dashboard/movements - Get stock movement statistics
router.get('/movements', authenticate, getMovementStatsHandler);

// GET /api/dashboard/low-stock - Get products with low stock
router.get('/low-stock', authenticate, getLowStockHandler);

// GET /api/dashboard/price-distribution - Get price distribution by category
router.get('/price-distribution', authenticate, getPriceDistributionHandler);

export default router;
