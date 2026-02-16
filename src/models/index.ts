import { sequelize } from '../config/database';
import Category from './Category';
import Product from './Product';
import User from './User';
import StockMovement from './StockMovement';
import ProductImage from './ProductImage';
import Notification from './Notification';

/**
 * Define model associations
 */

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
Product.belongsTo(Category, {
  foreignKey: 'categoryId',
  as: 'category',
});

Product.hasMany(StockMovement, {
  foreignKey: 'productId',
  as: 'stockMovements',
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
StockMovement.belongsTo(Product, {
  foreignKey: 'productId',
  as: 'product',
});

StockMovement.belongsTo(User, {
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
export { Category, Product, User, StockMovement, ProductImage, Notification, sequelize };
