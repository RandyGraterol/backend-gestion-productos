import { Response } from 'express';
import { AuthRequest } from '../types';
import * as dashboardService from '../services/dashboardService';
import { resolveTenantIdWithBypass } from '../utils/tenant';

/**
 * Dashboard Controller
 * Handles all dashboard-related requests — all filtered by userId
 */

/**
 * Get general dashboard statistics
 * GET /api/dashboard/stats
 */
export const getStatsHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = resolveTenantIdWithBypass(req.user!, req.query.tenantId as string | undefined);
    if (!userId) {
      res.status(401).json({ success: false, error: 'User authentication required' });
      return;
    }

    const { from, to } = req.query;
    let dateRange;
    if (from && to) {
      dateRange = { from: new Date(from as string), to: new Date(to as string) };
    }

    const stats = await dashboardService.getDashboardStats(userId, dateRange);
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error getting dashboard stats:', error);
    res.status(500).json({ success: false, message: 'Error al obtener estadísticas' });
  }
};

/**
 * Get category statistics
 * GET /api/dashboard/stats-by-category
 */
export const getCategoryStatsHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = resolveTenantIdWithBypass(req.user!, req.query.tenantId as string | undefined);
    if (!userId) {
      res.status(401).json({ success: false, error: 'User authentication required' });
      return;
    }

    const stats = await dashboardService.getCategoryStats(userId);
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error getting category stats:', error);
    res.status(500).json({ success: false, message: 'Error al obtener estadísticas de categorías' });
  }
};

/**
 * Get stock movement statistics
 * GET /api/dashboard/movements-by-day
 */
export const getMovementStatsHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = resolveTenantIdWithBypass(req.user!, req.query.tenantId as string | undefined);
    if (!userId) {
      res.status(401).json({ success: false, error: 'User authentication required' });
      return;
    }

    const days = parseInt(req.query.days as string) || 7;
    const stats = await dashboardService.getMovementStats(userId, days);
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error getting movement stats:', error);
    res.status(500).json({ success: false, message: 'Error al obtener estadísticas de movimientos' });
  }
};

/**
 * Get products with low stock
 * GET /api/dashboard/low-stock
 */
export const getLowStockHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = resolveTenantIdWithBypass(req.user!, req.query.tenantId as string | undefined);
    if (!userId) {
      res.status(401).json({ success: false, error: 'User authentication required' });
      return;
    }

    const limit = parseInt(req.query.limit as string) || 10;
    const products = await dashboardService.getLowStockProducts(userId, limit);
    res.json({ success: true, data: products });
  } catch (error) {
    console.error('Error getting low stock products:', error);
    res.status(500).json({ success: false, message: 'Error al obtener productos con stock bajo' });
  }
};

/**
 * Get top products
 * GET /api/dashboard/top-products
 */
export const getTopProductsHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = resolveTenantIdWithBypass(req.user!, req.query.tenantId as string | undefined);
    if (!userId) {
      res.status(401).json({ success: false, error: 'User authentication required' });
      return;
    }

    const limit = parseInt(req.query.limit as string) || 5;
    const products = await dashboardService.getTopProducts(userId, limit);
    res.json({ success: true, data: products });
  } catch (error) {
    console.error('Error getting top products:', error);
    res.status(500).json({ success: false, message: 'Error al obtener top productos' });
  }
};

/**
 * Get price distribution
 * GET /api/dashboard/price-distribution
 */
export const getPriceDistributionHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = resolveTenantIdWithBypass(req.user!, req.query.tenantId as string | undefined);
    if (!userId) {
      res.status(401).json({ success: false, error: 'User authentication required' });
      return;
    }

    const distribution = await dashboardService.getPriceDistribution(userId);
    res.json({ success: true, data: distribution });
  } catch (error) {
    console.error('Error getting price distribution:', error);
    res.status(500).json({ success: false, message: 'Error al obtener distribución de precios' });
  }
};

/**
 * Get profit stats
 * GET /api/dashboard/profits
 */
export const getProfitsHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = resolveTenantIdWithBypass(req.user!, req.query.tenantId as string | undefined);
    if (!userId) {
      res.status(401).json({ success: false, error: 'User authentication required' });
      return;
    }

    const days = parseInt(req.query.days as string) || 7;
    const stats = await dashboardService.getProfitStats(userId, days);
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error getting profit stats:', error);
    res.status(500).json({ success: false, message: 'Error al obtener reporte de ganancias' });
  }
};
