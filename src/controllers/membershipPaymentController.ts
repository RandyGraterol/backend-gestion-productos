import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import * as membershipPaymentService from '../services/membershipPaymentService';

/**
 * Get all membership payments
 * GET /api/admin/membership-payments
 */
export const getAllHandler = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string | undefined;
    const search = req.query.search as string | undefined;

    const result = await membershipPaymentService.getAllPayments(
      page,
      limit,
      status as any,
      search
    );

    res.status(200).json({
      success: true,
      data: result.items,
      pagination: {
        page: result.page,
        totalPages: result.totalPages,
        total: result.total,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get payment stats
 * GET /api/admin/membership-payments/stats
 */
export const getStatsHandler = async (
  _req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const stats = await membershipPaymentService.getPaymentStats();
    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update payment status
 * PUT /api/admin/membership-payments/:id/status
 */
export const updateStatusHandler = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user?.id;

    if (!status || !['pendiente', 'aprobado', 'rechazado'].includes(status)) {
      res.status(400).json({
        success: false,
        error: 'Invalid status. Must be: pendiente, aprobado, or rechazado',
      });
      return;
    }

    const payment = await membershipPaymentService.updatePaymentStatus(
      id,
      status,
      userId
    );

    res.status(200).json({
      success: true,
      data: payment,
      message: `Payment ${status === 'aprobado' ? 'approved' : status === 'rechazado' ? 'rejected' : 'updated'} successfully`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a payment
 * DELETE /api/admin/membership-payments/:id
 */
export const deleteHandler = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    await membershipPaymentService.deletePayment(id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
