import { Response, NextFunction } from 'express';
import { getAdminOverview } from '../services/userService';
import { AuthRequest } from '../types';

/**
 * Admin: overview global para supervisión
 * GET /api/admin/overview
 */
export const adminOverviewHandler = async (
  _req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const overview = await getAdminOverview();
    res.status(200).json({ success: true, data: overview });
  } catch (error) {
    next(error);
  }
};
