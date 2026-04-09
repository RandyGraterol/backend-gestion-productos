import { Router } from 'express';
import {
  createHandler,
  getAllHandler,
  getByIdHandler,
  updateHandler,
  deleteHandler,
} from '../controllers/categoryController';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validator';

const router = Router();

/**
 * GET /api/categories
 * Get all categories
 */
router.get('/', authenticate, getAllHandler);

/**
 * GET /api/categories/:id
 * Get category by ID
 */
router.get('/:id', authenticate, getByIdHandler);

/**
 * POST /api/categories
 * Create a new category
 */
router.post(
  '/',
  authenticate,
  validate([
    { field: 'name', required: true, type: 'string', min: 1, max: 100 },
    { field: 'description', required: false, type: 'string' },
    { field: 'parentId', required: false, type: 'string' },
    { field: 'icon', required: false, type: 'string', max: 50 },
    { field: 'color', required: false, type: 'string', pattern: /^#[0-9A-F]{6}$/i },
  ]),
  createHandler
);

/**
 * PUT /api/categories/:id
 * Update category
 */
router.put(
  '/:id',
  authenticate,
  validate([
    { field: 'name', required: false, type: 'string', min: 1, max: 100 },
    { field: 'description', required: false, type: 'string' },
    { field: 'parentId', required: false, type: 'string' },
    { field: 'icon', required: false, type: 'string', max: 50 },
    { field: 'color', required: false, type: 'string', pattern: /^#[0-9A-F]{6}$/i },
  ]),
  updateHandler
);

/**
 * DELETE /api/categories/:id
 * Delete category
 */
router.delete('/:id', authenticate, deleteHandler);

export default router;
