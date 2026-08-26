import { QueryInterface, DataTypes } from 'sequelize';

/**
 * Migration: Add IP/VPN detection fields to users table
 * - registrationIp: IPv4 or IPv6 address from registration
 * - registrationLocation: Country/City detected from registration IP
 * - isVpn: Whether registration IP belongs to a VPN/proxy network
 */
export async function up(queryInterface: QueryInterface): Promise<void> {
  const table = await queryInterface.describeTable('users');

  if (!table.registrationIp) {
    await queryInterface.addColumn('users', 'registrationIp', {
      type: DataTypes.STRING(45),
      allowNull: true,
      defaultValue: null,
      comment: 'IPv4 or IPv6 address from registration',
    });
    console.log('✅ Added registrationIp column to users table');
  }

  if (!table.registrationLocation) {
    await queryInterface.addColumn('users', 'registrationLocation', {
      type: DataTypes.STRING(255),
      allowNull: true,
      defaultValue: null,
      comment: 'Country/City detected from registration IP',
    });
    console.log('✅ Added registrationLocation column to users table');
  }

  if (!table.isVpn) {
    await queryInterface.addColumn('users', 'isVpn', {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether registration IP belongs to a VPN/proxy network',
    });
    console.log('✅ Added isVpn column to users table');
  }

  // Add index on registrationIp for admin queries
  try {
    await queryInterface.addIndex('users', ['registrationIp'], {
      name: 'idx_users_registrationIp',
    });
    console.log('✅ Added index on registrationIp');
  } catch {
    // Index may already exist
    console.log('ℹ️  Index idx_users_registrationIp already exists or skipped');
  }
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.removeIndex('users', 'idx_users_registrationIp').catch(() => {});
  await queryInterface.removeColumn('users', 'registrationIp').catch(() => {});
  await queryInterface.removeColumn('users', 'registrationLocation').catch(() => {});
  await queryInterface.removeColumn('users', 'isVpn').catch(() => {});
  console.log('✅ Removed IP/VPN columns from users table');
}
