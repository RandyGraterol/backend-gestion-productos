import { QueryInterface, DataTypes } from 'sequelize';

/**
 * Migration: Add all potentially missing columns to products table
 * These columns are defined in the Product model but may not exist in the database
 * if the original schema didn't include them.
 */
export async function up(queryInterface: QueryInterface): Promise<void> {
  const table = await queryInterface.describeTable('products');

  // 1. currency — needed for multi-currency pricing (USD/VES)
  if (!table.currency) {
    await queryInterface.addColumn('products', 'currency', {
      type: DataTypes.STRING(3),
      allowNull: false,
      defaultValue: 'VES',
    });
    console.log('✅ Added currency column to products table');
  }

  // 2. cost — product cost price
  if (!table.cost) {
    await queryInterface.addColumn('products', 'cost', {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    });
    console.log('✅ Added cost column to products table');
  }

  // 3. maxStock — maximum stock level
  if (!table.maxStock) {
    await queryInterface.addColumn('products', 'maxStock', {
      type: DataTypes.INTEGER,
      allowNull: true,
    });
    console.log('✅ Added maxStock column to products table');
  }

  // 4. location — storage location
  if (!table.location) {
    await queryInterface.addColumn('products', 'location', {
      type: DataTypes.STRING(100),
      allowNull: true,
    });
    console.log('✅ Added location column to products table');
  }

  // 5. barcode — product barcode
  if (!table.barcode) {
    await queryInterface.addColumn('products', 'barcode', {
      type: DataTypes.STRING(50),
      allowNull: true,
    });
    console.log('✅ Added barcode column to products table');
  }

  // 6. imageUrl — product image URL
  if (!table.imageUrl) {
    await queryInterface.addColumn('products', 'imageUrl', {
      type: DataTypes.STRING(500),
      allowNull: true,
    });
    console.log('✅ Added imageUrl column to products table');
  }

  // 7. isActive — product active status
  if (!table.isActive) {
    await queryInterface.addColumn('products', 'isActive', {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    });
    console.log('✅ Added isActive column to products table');
  }
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  const columns = ['currency', 'cost', 'maxStock', 'location', 'barcode', 'imageUrl', 'isActive'];
  for (const col of columns) {
    await queryInterface.removeColumn('products', col).catch(() => {});
  }
  console.log('✅ Removed missing product columns');
}
