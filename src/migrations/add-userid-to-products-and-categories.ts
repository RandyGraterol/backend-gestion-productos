/**
 * Migration: Add userId to products and categories for multi-tenant isolation
 * Each user will only see their own inventory data
 */

import { QueryInterface, DataTypes } from 'sequelize';

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    // Add userId to products table
    const productsTable = await queryInterface.describeTable('products');
    if (!productsTable.userId) {
      await queryInterface.addColumn('products', 'userId', {
        type: DataTypes.UUID,
        allowNull: false,
        defaultValue: DataTypes.UUIDV4,
        references: {
          model: 'users',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',

      });

      // Create index for efficient queries
      await queryInterface.addIndex('products', ['userId'], {
        name: 'idx_products_userId',
      });

      // Add composite unique index for userId + sku (SKU unique per user)
      await queryInterface.addIndex('products', ['userId', 'sku'], {
        unique: true,
        name: 'idx_products_userId_sku',
      });

      console.log('✅ Added userId to products table');
    }

    // Add userId to categories table
    const categoriesTable = await queryInterface.describeTable('categories');
    if (!categoriesTable.userId) {
      await queryInterface.addColumn('categories', 'userId', {
        type: DataTypes.UUID,
        allowNull: false,
        defaultValue: DataTypes.UUIDV4,
        references: {
          model: 'users',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',

      });

      // Create index for efficient queries
      await queryInterface.addIndex('categories', ['userId'], {
        name: 'idx_categories_userId',
      });

      // Add composite unique index for userId + name (name unique per user)
      await queryInterface.addIndex('categories', ['userId', 'name'], {
        unique: true,
        name: 'idx_categories_userId_name',
      });

      console.log('✅ Added userId to categories table');
    }
  },

  down: async (queryInterface: QueryInterface) => {
    // Remove indexes and columns
    await queryInterface.removeIndex('products', 'idx_products_userId').catch(() => {});
    await queryInterface.removeIndex('products', 'idx_products_userId_sku').catch(() => {});
    await queryInterface.removeColumn('products', 'userId').catch(() => {});

    await queryInterface.removeIndex('categories', 'idx_categories_userId').catch(() => {});
    await queryInterface.removeIndex('categories', 'idx_categories_userId_name').catch(() => {});
    await queryInterface.removeColumn('categories', 'userId').catch(() => {});

    console.log('✅ Removed userId from products and categories tables');
  },
};
