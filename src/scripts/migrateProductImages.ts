import { sequelize } from '../config/database';
import { QueryInterface } from 'sequelize';

/**
 * Migration script to add product_images table
 * Run this script once to create the product_images table
 */

async function migrateProductImages() {
  try {
    console.log('🔄 Starting migration for product_images table...\n');

    await sequelize.authenticate();
    console.log('✅ Database connection established\n');

    const queryInterface: QueryInterface = sequelize.getQueryInterface();

    // Check if table exists
    const tables = await queryInterface.showAllTables();
    console.log('📋 Existing tables:', tables);

    if (tables.includes('product_images')) {
      console.log('\n✅ product_images table already exists. No migration needed.');
      return;
    }

    console.log('\n📦 Creating product_images table...');

    // Create product_images table
    await queryInterface.createTable('product_images', {
      id: {
        type: 'UUID',
        primaryKey: true,
        allowNull: false,
      },
      productId: {
        type: 'UUID',
        allowNull: false,
        references: {
          model: 'products',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      imageUrl: {
        type: 'VARCHAR(500)',
        allowNull: false,
      },
      fileName: {
        type: 'VARCHAR(255)',
        allowNull: false,
      },
      fileSize: {
        type: 'INTEGER',
        allowNull: false,
      },
      mimeType: {
        type: 'VARCHAR(100)',
        allowNull: false,
      },
      isPrimary: {
        type: 'BOOLEAN',
        allowNull: false,
        defaultValue: false,
      },
      displayOrder: {
        type: 'INTEGER',
        allowNull: false,
        defaultValue: 0,
      },
      createdAt: {
        type: 'DATETIME',
        allowNull: false,
      },
      updatedAt: {
        type: 'DATETIME',
        allowNull: false,
      },
    });

    console.log('✅ product_images table created successfully');

    // Create indexes
    console.log('\n📑 Creating indexes...');

    await queryInterface.addIndex('product_images', ['productId'], {
      name: 'product_images_product_id',
    });

    await queryInterface.addIndex('product_images', ['productId', 'isPrimary'], {
      name: 'product_images_product_id_is_primary',
    });

    await queryInterface.addIndex('product_images', ['productId', 'displayOrder'], {
      name: 'product_images_product_id_display_order',
    });

    console.log('✅ Indexes created successfully');

    console.log('\n🎉 Migration completed successfully!');
    console.log('\n📝 Summary:');
    console.log('   - product_images table created');
    console.log('   - 3 indexes created');
    console.log('   - Foreign key relationship with products table established');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  } finally {
    await sequelize.close();
    console.log('\n🔌 Database connection closed');
  }
}

// Run migration
migrateProductImages()
  .then(() => {
    console.log('\n✅ Migration script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration script failed:', error);
    process.exit(1);
  });
