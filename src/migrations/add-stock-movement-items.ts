import { QueryInterface, DataTypes } from 'sequelize';

/**
 * Idempotent migration for stock_movement_items table and stock_movements header fields
 * Safe to run multiple times - checks existence before creating
 */

interface TableInfo {
  tableName?: string;
  name?: string;
}

interface IndexInfo {
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

async function indexExists(queryInterface: QueryInterface, tableName: string, indexName: string): Promise<boolean> {
  const indexes = await queryInterface.showIndex(tableName) as IndexInfo[];
  return indexes.some((idx: IndexInfo) => idx.name === indexName);
}

async function enumTypeExists(queryInterface: QueryInterface, typeName: string): Promise<boolean> {
  try {
    const [results] = await queryInterface.sequelize.query(
      `SELECT 1 FROM pg_type WHERE typname = '${typeName}'`
    );
    return (results as any[]).length > 0;
  } catch {
    return false;
  }
}

module.exports = {
  async up(queryInterface: QueryInterface) {
    console.log('🔄 Running idempotent migration: add-stock-movement-items');

    // 1. Create stock_movement_items table if not exists
    const itemsTableExists = await tableExists(queryInterface, 'stock_movement_items');
    
    if (!itemsTableExists) {
      console.log('📦 Creating stock_movement_items table...');
      
      // Create enum type if not exists
      const currencyEnumExists = await enumTypeExists(queryInterface, 'enum_stock_movement_items_currency');
      if (!currencyEnumExists) {
        await queryInterface.sequelize.query(
          `CREATE TYPE "enum_stock_movement_items_currency" AS ENUM ('USD', 'VES')`
        );
        console.log('  ✓ Created enum enum_stock_movement_items_currency');
      }

      await queryInterface.createTable('stock_movement_items', {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        movementId: {
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: 'stock_movements',
            key: 'id',
          },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        },
        productId: {
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: 'products',
            key: 'id',
          },
          onDelete: 'RESTRICT',
          onUpdate: 'CASCADE',
        },
        quantity: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        unitPrice: {
          type: DataTypes.DECIMAL(12, 2),
          allowNull: false,
        },
        totalPrice: {
          type: DataTypes.DECIMAL(12, 2),
          allowNull: false,
        },
        currency: {
          type: DataTypes.ENUM('USD', 'VES'),
          allowNull: false,
          defaultValue: 'USD',
        },
        exchangeRateSnapshot: {
          type: DataTypes.DECIMAL(12, 4),
          allowNull: false,
          defaultValue: 1,
        },
        previousStock: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        newStock: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
        },
      });
      console.log('  ✓ Created stock_movement_items table');
    } else {
      console.log('  ⏭ stock_movement_items table already exists');
    }

    // 2. Add foreign key constraints if not exist
    try {
      await queryInterface.addConstraint('stock_movement_items', {
        fields: ['movementId'],
        type: 'foreign key',
        name: 'stock_movement_items_movementId_fkey',
        references: {
          table: 'stock_movements',
          field: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      });
      console.log('  ✓ Added FK stock_movement_items_movementId_fkey');
    } catch (e: any) {
      if (e.parent?.code === '42710') {
        console.log('  ⏭ FK stock_movement_items_movementId_fkey already exists');
      } else {
        throw e;
      }
    }

    try {
      await queryInterface.addConstraint('stock_movement_items', {
        fields: ['productId'],
        type: 'foreign key',
        name: 'stock_movement_items_productId_fkey',
        references: {
          table: 'products',
          field: 'id',
        },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      });
      console.log('  ✓ Added FK stock_movement_items_productId_fkey');
    } catch (e: any) {
      if (e.parent?.code === '42710') {
        console.log('  ⏭ FK stock_movement_items_productId_fkey already exists');
      } else {
        throw e;
      }
    }

    // 3. Add indexes if not exist
    const movementIndexExists = await indexExists(queryInterface, 'stock_movement_items', 'stock_movement_items_movement_id');
    if (!movementIndexExists) {
      await queryInterface.addIndex('stock_movement_items', ['movementId'], {
        name: 'stock_movement_items_movement_id',
      });
      console.log('  ✓ Added index stock_movement_items_movement_id');
    } else {
      console.log('  ⏭ Index stock_movement_items_movement_id already exists');
    }

    const productIndexExists = await indexExists(queryInterface, 'stock_movement_items', 'stock_movement_items_product_id');
    if (!productIndexExists) {
      await queryInterface.addIndex('stock_movement_items', ['productId'], {
        name: 'stock_movement_items_product_id',
      });
      console.log('  ✓ Added index stock_movement_items_product_id');
    } else {
      console.log('  ⏭ Index stock_movement_items_product_id already exists');
    }

    // 4. Add header columns to stock_movements if not exist
    const movementsColumns = [
      { name: 'totalAmountUSD', type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      { name: 'totalAmountVES', type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      { name: 'itemCount', type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    ];

    for (const col of movementsColumns) {
      const exists = await columnExists(queryInterface, 'stock_movements', col.name);
      if (!exists) {
        await queryInterface.addColumn('stock_movements', col.name, col);
        console.log(`  ✓ Added column stock_movements.${col.name}`);
      } else {
        console.log(`  ⏭ Column stock_movements.${col.name} already exists`);
      }
    }

    console.log('✅ Idempotent migration completed successfully');
  },

  async down(queryInterface: QueryInterface) {
    console.log('🔄 Reverting migration: add-stock-movement-items');

    // Remove header columns
    for (const colName of ['totalAmountUSD', 'totalAmountVES', 'itemCount']) {
      const exists = await columnExists(queryInterface, 'stock_movements', colName);
      if (exists) {
        await queryInterface.removeColumn('stock_movements', colName);
        console.log(`  ✓ Removed column stock_movements.${colName}`);
      }
    }

    // Drop table (cascades to indexes/constraints)
    const itemsTableExists = await tableExists(queryInterface, 'stock_movement_items');
    if (itemsTableExists) {
      await queryInterface.dropTable('stock_movement_items');
      console.log('  ✓ Dropped stock_movement_items table');
    }

    // Drop enum type if no other tables use it
    const currencyEnumExists = await enumTypeExists(queryInterface, 'enum_stock_movement_items_currency');
    if (currencyEnumExists) {
      const usage = await queryInterface.sequelize.query(
        `SELECT 1 FROM pg_enum e
         JOIN pg_type t ON e.enumtypid = t.oid
         WHERE t.typname = 'enum_stock_movement_items_currency'
         LIMIT 1`
      );
      if (!(usage as any[])[0]?.length) {
        await queryInterface.sequelize.query(`DROP TYPE "enum_stock_movement_items_currency"`);
        console.log('  ✓ Dropped enum enum_stock_movement_items_currency');
      }
    }

    console.log('✅ Migration reverted successfully');
  },
};