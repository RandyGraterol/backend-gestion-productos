import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import * as categoryService from '../services/categoryService';
import { resolveTenantId, resolveTenantIdWithBypass } from '../utils/tenant';

/**
 * Create a new category
 * POST /api/categories
 */
export const createHandler = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = resolveTenantId(req.user!);
    if (!userId) {
      res.status(401).json({ success: false, error: 'User authentication required' });
      return;
    }

    const categoryData = { ...req.body, userId };
    const category = await categoryService.createCategory(categoryData);

    res.status(201).json({
      success: true,
      data: category,
      message: 'Category created successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all categories for the authenticated user
 * GET /api/categories
 */
export const getAllHandler = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = resolveTenantIdWithBypass(req.user!, req.query.tenantId as string | undefined);
    if (!userId) {
      res.status(401).json({ success: false, error: 'User authentication required' });
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const search = req.query.search as string;

    const result = await categoryService.getAllCategories(userId, page, limit, search);

    res.status(200).json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get category by ID
 * GET /api/categories/:id
 */
export const getByIdHandler = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = resolveTenantId(req.user!);
    const category = await categoryService.getCategoryById(req.params.id, userId);

    res.status(200).json({
      success: true,
      data: category,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update category
 * PUT /api/categories/:id
 */
export const updateHandler = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = resolveTenantId(req.user!);
    if (!userId) {
      res.status(401).json({ success: false, error: 'User authentication required' });
      return;
    }

    const category = await categoryService.updateCategory(req.params.id, req.body, userId);

    res.status(200).json({
      success: true,
      data: category,
      message: 'Category updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete category
 * DELETE /api/categories/:id
 */
export const deleteHandler = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = resolveTenantId(req.user!);
    await categoryService.deleteCategory(req.params.id, userId);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
