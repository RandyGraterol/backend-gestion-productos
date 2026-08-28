import { sequelize } from '../config/database';

/**
 * Run migration to add stock_movement_items table and header fields
 */
async function runMigration() {
  try {
    console.log('🔄 Starting stock movement items migration...');
    
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connection established');

    // Import and run migration
    const migration = require('../migrations/add-stock-movement-items');
    await migration.up(sequelize.getQueryInterface());
    
    console.log('✅ Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();