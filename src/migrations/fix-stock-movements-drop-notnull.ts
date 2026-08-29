import { QueryInterface } from 'sequelize';

/**
 * Drop NOT NULL from legacy single-product columns in stock_movements.
 * The new multi-product design stores product data in stock_movement_items.
 */

interface TableInfo {
  tableName?: string;
  name?: string;
}

async function tableExists(qi: QueryInterface, name: string): Promise<boolean> {
  const tables = await qi.showAllTables() as TableInfo[];
  return tables.some((t: TableInfo) => t.tableName === name || t.name === name);
}

async function columnExists(qi: QueryInterface, table: string, col: string): Promise<boolean> {
  const desc = await qi.describeTable(table);
  return !!desc[col];
}

/** Check if a specific column is NOT nullable */
async function isNotNull(qi: QueryInterface, table: string, col: string): Promise<boolean> {
  const [rows] = await qi.sequelize.query(
    `SELECT is_nullable FROM information_schema.columns WHERE table_name = '${table}' AND column_name = '${col}'`
  );
  return (rows as any[])[0]?.is_nullable === 'NO';
}

module.exports = {
  async up(queryInterface: QueryInterface) {
    console.log('🔄 Running migration: fix-stock-movements-drop-notnull');

    if (!(await tableExists(queryInterface, 'stock_movements'))) {
      console.log('  ⏭ stock_movements does not exist, skipping');
      return;
    }

    // Legacy columns from old single-product design that are no longer used
    const legacyColumns = ['productId', 'quantity', 'previousStock', 'newStock'];

    for (const col of legacyColumns) {
      if (!(await columnExists(queryInterface, 'stock_movements', col))) {
        console.log(`  ⏭ Column ${col} does not exist, skipping`);
        continue;
      }
      if (!(await isNotNull(queryInterface, 'stock_movements', col))) {
        console.log(`  ⏭ Column ${col} is already nullable`);
        continue;
      }
      await queryInterface.sequelize.query(
        `ALTER TABLE "stock_movements" ALTER COLUMN "${col}" DROP NOT NULL`
      );
      console.log(`  ✓ Made ${col} nullable`);
    }

    // Also drop the foreign key on productId since it's no longer used
    try {
      await queryInterface.sequelize.query(
        `ALTER TABLE "stock_movements" DROP CONSTRAINT IF EXISTS "stock_movements_productId_fkey"`
      );
      console.log('  ✓ Dropped productId foreign key constraint');
    } catch { /* ignore */ }

    console.log('✅ Migration fix-stock-movements-drop-notnull completed');
  },

  async down(_queryInterface: QueryInterface) {
    // Not reversible — we can't restore the original NOT NULL without data validation
    console.log('⏭ Down migration not supported for this fix');
  },
};
