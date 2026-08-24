import { Response, NextFunction } from 'express';
import * as stockService from '../services/stockService';
import { AuthRequest } from '../types';
import { resolveTenantId, resolveTenantIdWithBypass } from '../utils/tenant';

/**
 * Create a stock movement
 * POST /api/stock/movements
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

    // Add userId from authenticated user
    const movementData = {
      ...req.body,
      userId,
    };

    const movement = await stockService.createStockMovement(movementData);

    res.status(201).json({
      success: true,
      data: movement,
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
      productId: req.query.productId as string,
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
 * Get stock movement by ID
 * GET /api/stock/movements/:id
 */
export const getMovementByIdHandler = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = resolveTenantId(req.user!);
    const movement = await stockService.getStockMovementById(req.params.id, userId);

    res.status(200).json({
      success: true,
      data: movement,
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
    const movements = await stockService.getProductStockHistory(req.params.productId, limit, userId);

    res.status(200).json({
      success: true,
      data: movements,
    });
  } catch (error) {
    next(error);
  }
};
