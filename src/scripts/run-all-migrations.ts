import { sequelize } from '../config/database';
import path from 'path';

/**
 * List of all migrations in execution order.
 * Each migration must export an `up(queryInterface)` function.
 */
const MIGRATIONS = [
  'add-missing-user-columns',
  'add-missing-product-columns',
  'add-missing-category-columns',
  'add-deletedAt-to-products-and-categories',
  'add-expiry-date-to-products',
  'add-userid-to-products-and-categories',
  'add-location-vpn-to-download-logs',
  'add-ip-vpn-fields-to-users',
  'add-stock-movement-items',
  'fix-stock-movements-drop-notnull',
  'add-exchange-rate-fields-to-users',
];

/**
 * Run all migrations idempotently.
 * Safe to execute multiple times — each migration checks existence before acting.
 */
async function runAllMigrations(): Promise<void> {
  console.log('🔄 Running all database migrations...\n');

  // Test database connection
  await sequelize.authenticate();
  console.log('✅ Database connection established\n');

  const queryInterface = sequelize.getQueryInterface();
  let successCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const migrationName of MIGRATIONS) {
    try {
      console.log(`━━━ Migration: ${migrationName} ━━━`);

      // Dynamic import — works with both `export async function up()` and `module.exports = { up }`
      const migrationPath = path.join(__dirname, '..', 'migrations', migrationName);
      const migration = require(migrationPath);

      // Extract the `up` function (handles both named export and module.exports patterns)
      const upFn = typeof migration.up === 'function'
        ? migration.up
        : typeof migration.default?.up === 'function'
          ? migration.default.up
          : null;

      if (!upFn) {
        console.log(`⚠️  Migration "${migrationName}" has no "up" function — skipping\n`);
        skippedCount++;
        continue;
      }

      await upFn(queryInterface);
      console.log(`✅ Migration "${migrationName}" completed\n`);
      successCount++;
    } catch (error: any) {
      console.error(`❌ Migration "${migrationName}" failed:`, error.message || error);
      console.error('');
      errorCount++;
      // Continue with next migration — don't abort the whole sequence
    }
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📊 Migration summary: ${successCount} succeeded, ${skippedCount} skipped, ${errorCount} failed`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (errorCount > 0) {
    console.warn('⚠️  Some migrations failed. Review the errors above.');
  }
}

// Run if called directly (not imported)
if (require.main === module) {
  runAllMigrations()
    .then(() => {
      console.log('✅ All migrations finished.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration runner failed:', error);
      process.exit(1);
    });
}

export { runAllMigrations };
