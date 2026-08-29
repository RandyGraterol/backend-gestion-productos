import { QueryInterface, DataTypes } from 'sequelize';

/**
 * Migration: Add potentially missing columns to categories table
 */
export async function up(queryInterface: QueryInterface): Promise<void> {
  const table = await queryInterface.describeTable('categories');

  // 1. icon — category icon name
  if (!table.icon) {
    await queryInterface.addColumn('categories', 'icon', {
      type: DataTypes.STRING(50),
      allowNull: true,
    });
    console.log('✅ Added icon column to categories table');
  }

  // 2. color — category hex color
  if (!table.color) {
    await queryInterface.addColumn('categories', 'color', {
      type: DataTypes.STRING(7),
      allowNull: true,
    });
    console.log('✅ Added color column to categories table');
  }
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.removeColumn('categories', 'icon').catch(() => {});
  await queryInterface.removeColumn('categories', 'color').catch(() => {});
  console.log('✅ Removed missing category columns');
}
