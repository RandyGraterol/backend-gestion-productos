import { sequelize } from '../config/database';
import { up as upUsers } from '../migrations/add-ip-vpn-fields-to-users';
import { up as upDownloadLogs } from '../migrations/add-location-vpn-to-download-logs';

/**
 * Run all IP/VPN detection migrations:
 * 1. Add registrationIp, registrationLocation, isVpn to users
 * 2. Add location, isVpn to download_logs
 */
async function runMigrations() {
  try {
    console.log('🔄 Starting IP/VPN field migrations...\n');

    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connection established\n');

    // Migration 1: users table
    console.log('📋 Migration 1: Adding IP/VPN fields to users table...');
    await upUsers(sequelize.getQueryInterface());
    console.log('');

    // Migration 2: download_logs table
    console.log('📋 Migration 2: Adding location/VPN fields to download_logs table...');
    await upDownloadLogs(sequelize.getQueryInterface());
    console.log('');

    console.log('✅ All IP/VPN migrations completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigrations();
