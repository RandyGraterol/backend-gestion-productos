import { sequelize } from '../config/database';
import Category from './Category';
import Product from './Product';
import User from './User';
import StockMovement from './StockMovement';
import StockMovementItem from './StockMovementItem';
import ProductImage from './ProductImage';
import Notification from './Notification';
import AppVersion from './AppVersion';
import DownloadVerification from './DownloadVerification';
import DonationMethod from './DonationMethod';
import Donation from './Donation';
import DownloadLog from './DownloadLog';
import ContactMessage from './ContactMessage';
import MembershipPayment from './MembershipPayment';

/**
 * Define model associations
 */

// User -> Product association
User.hasMany(Product, {
  foreignKey: 'userId',
  as: 'products',
  onDelete: 'CASCADE',
});

Product.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
});

// User -> Category association
User.hasMany(Category, {
  foreignKey: 'userId',
  as: 'categories',
  onDelete: 'CASCADE',
});

Category.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
});

// Category associations
Category.hasMany(Product, {
  foreignKey: 'categoryId',
  as: 'products',
});

Category.hasMany(Category, {
  foreignKey: 'parentId',
  as: 'children',
});

Category.belongsTo(Category, {
  foreignKey: 'parentId',
  as: 'parent',
});

// Product associations
Product.hasMany(StockMovementItem, {
  foreignKey: 'productId',
  as: 'stockMovementItems',
});

Product.hasMany(ProductImage, {
  foreignKey: 'productId',
  as: 'images',
  onDelete: 'CASCADE',
});

// ProductImage associations
ProductImage.belongsTo(Product, {
  foreignKey: 'productId',
  as: 'product',
});

// User associations
User.hasMany(StockMovement, {
  foreignKey: 'userId',
  as: 'stockMovements',
});

User.hasMany(Notification, {
  foreignKey: 'userId',
  as: 'notifications',
  onDelete: 'CASCADE',
});

// Notification associations
Notification.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
});

// StockMovement associations
StockMovement.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
});

StockMovement.hasMany(StockMovementItem, {
  foreignKey: 'movementId',
  as: 'items',
  onDelete: 'CASCADE',
});

StockMovementItem.belongsTo(StockMovement, {
  foreignKey: 'movementId',
  as: 'movement',
});

StockMovementItem.belongsTo(Product, {
  foreignKey: 'productId',
  as: 'product',
});

// AppVersion associations
AppVersion.belongsTo(User, {
  foreignKey: 'uploadedBy',
  as: 'uploader',
});

User.hasMany(AppVersion, {
  foreignKey: 'uploadedBy',
  as: 'appVersions',
});

// User -> MembershipPayment association
User.hasMany(MembershipPayment, {
  foreignKey: 'userId',
  as: 'membershipPayments',
  onDelete: 'CASCADE',
});

MembershipPayment.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
});

/**
 * Initialize database
 * Syncs all models with the database
 */
export const initializeDatabase = async (options: { force?: boolean; alter?: boolean } = {}): Promise<void> => {
  try {
    await sequelize.authenticate();
    console.log('Database connection established successfully.');

    await sequelize.sync(options);
    if (options.force) {
      console.log('Database synchronized (forced - all tables dropped and recreated).');
    } else if (options.alter) {
      console.log('Database synchronized (alter - tables updated to match models).');
    } else {
      console.log('Database synchronized.');
    }
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
};

/**
 * Export all models
 */
export { Category, Product, User, StockMovement, StockMovementItem, ProductImage, Notification, AppVersion, DownloadVerification, DonationMethod, Donation, DownloadLog, ContactMessage, MembershipPayment, sequelize };