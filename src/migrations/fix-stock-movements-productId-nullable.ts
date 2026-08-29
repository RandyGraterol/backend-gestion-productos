import { QueryInterface } from 'sequelize';

/**
 * Idempotent migration to make productId nullable in stock_movements
 * With the new items-based design, products are stored in stock_movement_items
 * The stock_movements.productId column is no longer used and should be nullable
 */

interface TableInfo {
  tableName?: string;
  name?: string;
}

async function tableExists(queryInterface: QueryInterface, tableName: string): Promise<boolean> {
  const tables = await queryInterface.showAllTables() as TableInfo[];
  return tables.some((t: TableInfo) => t.tableName === tableName || t.name === tableName);
}

async function columnExists(queryInterface: QueryInterface, tableName: string, columnName: string): Promise<boolean> {
  const tableDescription = await queryInterface.describeTable(tableName);
  return !!tableDescription[columnName];
}

module.exports = {
  async up(queryInterface: QueryInterface) {
    console.log('🔄 Running migration: fix-stock-movements-productId-nullable');

    const tableExists_ = await tableExists(queryInterface, 'stock_movements');
    if (!tableExists_) {
      console.log('  ⏭ stock_movements table does not exist, skipping');
      return;
    }

    const hasProductId = await columnExists(queryInterface, 'stock_movements', 'productId');
    if (!hasProductId) {
      console.log('  ⏭ productId column does not exist in stock_movements, skipping');
      return;
    }

    // Check if productId is already nullable
    const [results] = await queryInterface.sequelize.query(
      `SELECT is_nullable 
       FROM information_schema.columns 
       WHERE table_name = 'stock_movements' 
       AND column_name = 'productId'`
    );

    const columnInfo = (results as any[])[0];
    if (columnInfo?.is_nullable === 'YES') {
      console.log('  ⏭ productId is already nullable');
      return;
    }

    // Drop the NOT NULL constraint
    await queryInterface.sequelize.query(
      `ALTER TABLE "stock_movements" ALTER COLUMN "productId" DROP NOT NULL`
    );
    console.log('  ✓ Made productId nullable in stock_movements');

    console.log('✅ Migration fix-stock-movements-productId-nullable completed');
  },

  async down(queryInterface: QueryInterface) {
    console.log('🔄 Reverting migration: fix-stock-movements-productId-nullable');

    const hasProductId = await columnExists(queryInterface, 'stock_movements', 'productId');
    if (hasProductId) {
      await queryInterface.sequelize.query(
        `ALTER TABLE "stock_movements" ALTER COLUMN "productId" SET NOT NULL`
      );
      console.log('  ✓ Set productId back to NOT NULL in stock_movements');
    }

    console.log('✅ Migration reverted');
  },
};
