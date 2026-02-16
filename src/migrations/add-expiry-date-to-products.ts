import { QueryInterface, DataTypes } from 'sequelize';

/**
 * Migration: Add expiryDate field to products table
 * This allows tracking product expiration dates for inventory management
 */
export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.addColumn('products', 'expiryDate', {
    type: DataTypes.DATE,
    allowNull: true,
  });

  console.log('✅ Added expiryDate column to products table');
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.removeColumn('products', 'expiryDate');
  console.log('✅ Removed expiryDate column from products table');
}
