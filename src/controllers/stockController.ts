import { Request, Response, NextFunction } from 'express';
import * as stockService from '../services/stockService';
import { AuthRequest } from '../types';

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
    // Add userId from authenticated user
    const movementData = {
      ...req.body,
      userId: req.user?.id,
    };

    const movement = await stockService.createStockMovement(movementData);

    res.status(201).json({
      success: true,
      data: movement,
      message: 'Stock movement created successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get stock movements with filters
 * GET /api/stock/movements
 */
export const getMovementsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const filters = {
      productId: req.query.productId as string,
      userId: req.query.userId as string,
      type: req.query.type as any,
      dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
      dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
    };

    const movements = await stockService.getStockMovements(filters);

    res.status(200).json({
      success: true,
      data: movements,
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
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const movement = await stockService.getStockMovementById(req.params.id);

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
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const movements = await stockService.getProductStockHistory(req.params.productId, limit);

    res.status(200).json({
      success: true,
      data: movements,
    });
  } catch (error) {
    next(error);
  }
};
