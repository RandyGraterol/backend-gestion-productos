import { Router } from 'express';
import authRoutes from './authRoutes';
import categoryRoutes from './categoryRoutes';
import productRoutes from './productRoutes';
import productImageRoutes from './productImageRoutes';
import stockRoutes from './stockRoutes';
import userRoutes from './userRoutes';
import dashboardRoutes from './dashboardRoutes';
import notificationRoutes from './notificationRoutes';
import userNotificationRoutes from './userNotificationRoutes';
import exchangeRateRoutes from './exchangeRateRoutes';
import appVersionRoutes from './appVersionRoutes';
import donationRoutes from './donationRoutes';
import contactRoutes from './contactRoutes';
import adminRoutes from './adminRoutes';
import settingsRoutes from './settingsRoutes';
import membershipPaymentRoutes from './membershipPaymentRoutes';
import { authenticate, requireOperatorVerified, requireTrialOrPlan } from '../middleware/auth';

const router = Router();

/**
 * Mount all route modules
 */
router.use('/auth', authRoutes);
router.use('/categories', authenticate, requireOperatorVerified, requireTrialOrPlan, categoryRoutes);
router.use('/products', authenticate, requireOperatorVerified, requireTrialOrPlan, productRoutes);
router.use('/products', authenticate, requireOperatorVerified, requireTrialOrPlan, productImageRoutes); // Product images routes
router.use('/stock', authenticate, requireOperatorVerified, requireTrialOrPlan, stockRoutes);
router.use('/users', userRoutes);
router.use('/dashboard', authenticate, requireOperatorVerified, requireTrialOrPlan, dashboardRoutes);
router.use('/notifications', notificationRoutes);
router.use('/user-notifications', userNotificationRoutes);
router.use('/exchange-rate', exchangeRateRoutes);
router.use('/app-versions', appVersionRoutes);
router.use('/donations', donationRoutes);
router.use('/contact', contactRoutes);
router.use('/admin', adminRoutes);
router.use('/admin/membership-payments', membershipPaymentRoutes);
router.use('/settings', settingsRoutes);

export default router;
