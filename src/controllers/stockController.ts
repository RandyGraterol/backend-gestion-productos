import { Response, NextFunction } from 'express';
import * as stockService from '../services/stockService';
import { AuthRequest } from '../types';
import { resolveTenantId, resolveTenantIdWithBypass } from '../utils/tenant';

/**
 * Create a multi-product stock movement
 * POST /api/stock/movements
 * Body: { type, reason?, reference?, items: [{ productId, quantity }] }
 */
export const createMovementHandler = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = resolveTenantId(req.user!);

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'User authentication required',
      });
      return;
    }

    // Validate items array
    const { type, reason, reference, items } = req.body;

    if (!type || !items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({
        success: false,
        error: 'Invalid request: type and items[] are required',
      });
      return;
    }

    // Validate each item
    for (const item of items) {
      if (!item.productId || !item.quantity || item.quantity < 1) {
        res.status(400).json({
          success: false,
          error: 'Each item must have productId and quantity >= 1',
        });
        return;
      }
    }

    const movementData = {
      type,
      reason,
      reference,
      userId,
      items,
    };

    const result = await stockService.createStockMovement(movementData);

    res.status(201).json({
      success: true,
      data: result,
      message: 'Stock movement created successfully',
    });
  } catch (error) {
    console.error('[StockController] createMovement error:', error);
    next(error);
  }
};

/**
 * Get stock movements with filters
 * GET /api/stock/movements
 */
export const getMovementsHandler = async (
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
    const limit = parseInt(req.query.limit as string) || 20;

    const filters = {
      userId, // Always filter by authenticated user
      type: req.query.type as any,
      dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
      dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined,
      page,
      limit,
    };

    const result = await stockService.getStockMovements(filters);

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
 * Get stock movement by ID with items
 * GET /api/stock/movements/:id
 */
export const getMovementByIdHandler = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = resolveTenantId(req.user!);
    const result = await stockService.getStockMovementById(req.params.id, userId);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get stock history for a product
 * GET /api/stock/products/:productId/history
 */
export const getProductHistoryHandler = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = resolveTenantId(req.user!);
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const items = await stockService.getProductStockHistory(req.params.productId, limit, userId);

    res.status(200).json({
      success: true,
      data: items,
    });
  } catch (error) {
    next(error);
  }
};