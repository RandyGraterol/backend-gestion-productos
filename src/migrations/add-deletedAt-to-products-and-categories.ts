import { QueryInterface, DataTypes } from 'sequelize';

/**
 * Idempotent migration: Add deletedAt column to products and categories
 * Both models use `paranoid: true` which requires this column for soft deletes.
 * Safe to run multiple times — checks existence before adding.
 */

async function columnExists(queryInterface: QueryInterface, tableName: string, columnName: string): Promise<boolean> {
  const table = await queryInterface.describeTable(tableName);
  return !!table[columnName];
}

export async function up(queryInterface: QueryInterface): Promise<void> {
  console.log('🔄 Running migration: add-deletedAt-to-products-and-categories');

  // Add deletedAt to products
  const productsHasDeletedAt = await columnExists(queryInterface, 'products', 'deletedAt');
  if (!productsHasDeletedAt) {
    await queryInterface.addColumn('products', 'deletedAt', {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
      comment: 'Soft delete timestamp - records with this set are excluded from queries',
    });
    console.log('✅ Added deletedAt column to products table');
  } else {
    console.log('⏭ Column deletedAt already exists in products table');
  }

  // Add deletedAt to categories
  const categoriesHasDeletedAt = await columnExists(queryInterface, 'categories', 'deletedAt');
  if (!categoriesHasDeletedAt) {
    await queryInterface.addColumn('categories', 'deletedAt', {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
      comment: 'Soft delete timestamp - records with this set are excluded from queries',
    });
    console.log('✅ Added deletedAt column to categories table');
  } else {
    console.log('⏭ Column deletedAt already exists in categories table');
  }

  console.log('✅ Migration add-deletedAt completed successfully');
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  console.log('🔄 Reverting migration: add-deletedAt-to-products-and-categories');

  const productsHasDeletedAt = await columnExists(queryInterface, 'products', 'deletedAt');
  if (productsHasDeletedAt) {
    await queryInterface.removeColumn('products', 'deletedAt');
    console.log('✅ Removed deletedAt from products');
  }

  const categoriesHasDeletedAt = await columnExists(queryInterface, 'categories', 'deletedAt');
  if (categoriesHasDeletedAt) {
    await queryInterface.removeColumn('categories', 'deletedAt');
    console.log('✅ Removed deletedAt from categories');
  }
}
