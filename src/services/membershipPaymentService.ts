import { Op } from 'sequelize';
import { MembershipPayment, User } from '../models';
import { AppError } from '../types';
import type { MembershipPaymentStatus } from '../models/MembershipPayment';

/**
 * Get all membership payments with pagination and filters
 */
export const getAllPayments = async (
  page: number = 1,
  limit: number = 20,
  status?: MembershipPaymentStatus,
  search?: string
): Promise<{
  items: any[];
  page: number;
  totalPages: number;
  total: number;
}> => {
  const offset = (page - 1) * limit;
  const where: any = {};

  if (status) {
    where.status = status;
  }

  const { count, rows } = await MembershipPayment.findAndCountAll({
    where,
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'email', 'role'],
      },
    ],
    order: [['createdAt', 'DESC']],
    limit,
    offset,
  });

  // Filter by user name/email if search is provided
  let filteredRows = rows;
  if (search) {
    const searchLower = search.toLowerCase();
    filteredRows = rows.filter((payment: any) => {
      const user = payment.user as any;
      return (
        user?.name?.toLowerCase().includes(searchLower) ||
        user?.email?.toLowerCase().includes(searchLower)
      );
    });
  }

  return {
    items: filteredRows.map((p) => formatPayment(p)),
    page,
    totalPages: Math.ceil(count / limit),
    total: count,
  };
};

/**
 * Get payment stats
 */
export const getPaymentStats = async (): Promise<{
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  monthly: number;
  annual: number;
  lifetime: number;
}> => {
  const [total, pending, approved, rejected, monthly, annual, lifetime] = await Promise.all([
    MembershipPayment.count(),
    MembershipPayment.count({ where: { status: 'pendiente' } }),
    MembershipPayment.count({ where: { status: 'aprobado' } }),
    MembershipPayment.count({ where: { status: 'rechazado' } }),
    MembershipPayment.count({ where: { plan: 'mensual' } }),
    MembershipPayment.count({ where: { plan: 'anual' } }),
    MembershipPayment.count({ where: { plan: 'lifetime' } }),
  ]);

  return { total, pending, approved, rejected, monthly, annual, lifetime };
};

/**
 * Update payment status and user plan
 */
export const updatePaymentStatus = async (
  paymentId: string,
  status: MembershipPaymentStatus,
  reviewedBy?: string
): Promise<any> => {
  const payment = await MembershipPayment.findByPk(paymentId, {
    include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'] }],
  });

  if (!payment) {
    throw new AppError('Payment not found', 404);
  }

  payment.status = status;
  payment.reviewedAt = new Date();
  if (reviewedBy) {
    payment.reviewedBy = reviewedBy;
  }

  // Calculate expiry date based on plan
  if (status === 'aprobado') {
    const now = new Date();
    if (payment.plan === 'mensual') {
      const expiry = new Date(now);
      expiry.setMonth(expiry.getMonth() + 1);
      payment.expiryDate = expiry;
    } else if (payment.plan === 'anual') {
      const expiry = new Date(now);
      expiry.setFullYear(expiry.getFullYear() + 1);
      payment.expiryDate = expiry;
    }
    // lifetime has no expiry

    // Update user plan
    const user = await User.findByPk(payment.userId);
    if (user) {
      user.plan = payment.plan;
      user.planStatus = 'activo';
      user.planExpiry = payment.expiryDate || null;
      await user.save();
    }
  } else if (status === 'rechazado') {
    // If rejected, check if user has other approved payments
    const approvedCount = await MembershipPayment.count({
      where: {
        userId: payment.userId,
        status: 'aprobado',
        id: { [Op.ne]: paymentId },
      },
    });

    if (approvedCount === 0) {
      // No other approved payments, set user plan to null
      const user = await User.findByPk(payment.userId);
      if (user) {
        user.plan = null;
        user.planStatus = null;
        user.planExpiry = null;
        await user.save();
      }
    }
  }

  await payment.save();
  return formatPayment(payment);
};

/**
 * Delete a payment
 */
export const deletePayment = async (paymentId: string): Promise<void> => {
  const payment = await MembershipPayment.findByPk(paymentId);
  if (!payment) {
    throw new AppError('Payment not found', 404);
  }
  await payment.destroy();
};

/**
 * Format payment for API response
 */
const formatPayment = (payment: any): any => {
  const user = payment.user;
  return {
    id: payment.id,
    userId: payment.userId,
    userName: user?.name || 'Unknown',
    userEmail: user?.email || 'Unknown',
    userRole: user?.role || 'client',
    plan: payment.plan,
    amount: payment.amount,
    currency: payment.currency,
    paymentMethod: payment.paymentMethod,
    comment: payment.comment,
    screenshotPath: payment.screenshotPath,
    screenshotName: payment.screenshotName,
    status: payment.status,
    reviewedAt: payment.reviewedAt,
    expiryDate: payment.expiryDate,
    createdAt: payment.createdAt,
  };
};
