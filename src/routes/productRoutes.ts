import { Router } from 'express';
import {
  createHandler,
  getAllHandler,
  getByIdHandler,
  updateHandler,
  deleteHandler,
  searchHandler,
} from '../controllers/productController';
import { authenticate, authorize } from '../middleware/auth';
import { upload } from '../config/multer';

const router = Router();

/**
 * GET /api/products/search
 * Search products (must be before /:id route)
 */
router.get('/search', authenticate, searchHandler);

/**
 * GET /api/products
 * Get all products with pagination
 */
router.get('/', authenticate, getAllHandler);

/**
 * GET /api/products/:id
 * Get product by ID
 */
router.get('/:id', authenticate, getByIdHandler);

/**
 * POST /api/products
 * Create a new product (admin/manager only)
 * Supports multipart/form-data with optional images
 */
router.post(
  '/',
  authenticate,
  authorize('admin', 'manager'),
  upload.array('images', 10), // Accept up to 10 images
  createHandler
);

/**
 * PUT /api/products/:id
 * Update product (admin/manager only)
 * Supports multipart/form-data with optional images
 */
router.put(
  '/:id',
  authenticate,
  authorize('admin', 'manager'),
  upload.array('images', 10), // Accept up to 10 images
  updateHandler
);

/**
 * DELETE /api/products/:id
 * Delete product (admin only)
 */
router.delete('/:id', authenticate, authorize('admin'), deleteHandler);

export default router;
