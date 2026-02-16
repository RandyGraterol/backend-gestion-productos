import { Request, Response } from 'express';
import * as dashboardService from '../services/dashboardService';

/**
 * Dashboard Controller
 * Handles all dashboard-related requests
 */

/**
 * Get general dashboard statistics
 * GET /api/dashboard/stats
 */
export const getStatsHandler = async (req: Request, res: Response) => {
  try {
    const { from, to } = req.query;
    
    let dateRange;
    if (from && to) {
      dateRange = {
        from: new Date(from as string),
        to: new Date(to as string),
      };
    }

    const stats = await dashboardService.getDashboardStats(dateRange);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Error getting dashboard stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas del dashboard',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Get category statistics
 * GET /api/dashboard/categories
 */
export const getCategoryStatsHandler = async (_req: Request, res: Response) => {
  try {
    const stats = await dashboardService.getCategoryStats();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Error getting category stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas de categorías',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Get stock movement statistics
 * GET /api/dashboard/movements?days=7
 */
export const getMovementStatsHandler = async (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 7;

    const stats = await dashboardService.getMovementStats(days);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Error getting movement stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas de movimientos',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Get products with low stock
 * GET /api/dashboard/low-stock?limit=10
 */
export const getLowStockHandler = async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;

    const products = await dashboardService.getLowStockProducts(limit);

    res.json({
      success: true,
      data: products,
    });
  } catch (error) {
    console.error('Error getting low stock products:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener productos con stock bajo',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Get price distribution by category
 * GET /api/dashboard/price-distribution
 */
export const getPriceDistributionHandler = async (_req: Request, res: Response) => {
  try {
    const distribution = await dashboardService.getPriceDistribution();

    res.json({
      success: true,
      data: distribution,
    });
  } catch (error) {
    console.error('Error getting price distribution:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener distribución de precios',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
