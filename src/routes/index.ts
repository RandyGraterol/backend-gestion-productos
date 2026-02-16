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

const router = Router();

/**
 * Mount all route modules
 */
router.use('/auth', authRoutes);
router.use('/categories', categoryRoutes);
router.use('/products', productRoutes);
router.use('/products', productImageRoutes); // Product images routes
router.use('/stock', stockRoutes);
router.use('/users', userRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/notifications', notificationRoutes);
router.use('/user-notifications', userNotificationRoutes);

export default router;
