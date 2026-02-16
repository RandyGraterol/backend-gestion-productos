import { sequelize } from '../config/database';
import { up } from '../migrations/add-expiry-date-to-products';

/**
 * Run migration to add expiryDate field to products
 */
async function runMigration() {
  try {
    console.log('🔄 Starting migration...');
    
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connection established');

    // Run migration
    await up(sequelize.getQueryInterface());
    
    console.log('✅ Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
