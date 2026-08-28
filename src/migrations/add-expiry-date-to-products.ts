import { QueryInterface, DataTypes } from 'sequelize';

/**
 * Migration: Add expiryDate field to products table
 * Idempotent - safe to run multiple times
 */
export async function up(queryInterface: QueryInterface): Promise<void> {
  const table = await queryInterface.describeTable('products');
  if (!table.expiryDate) {
    await queryInterface.addColumn('products', 'expiryDate', {
      type: DataTypes.DATE,
      allowNull: true,
    });
    console.log('✅ Added expiryDate column to products table');
  } else {
    console.log('⏭ Column expiryDate already exists in products table');
  }
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.removeColumn('products', 'expiryDate');
  console.log('✅ Removed expiryDate column from products table');
}
