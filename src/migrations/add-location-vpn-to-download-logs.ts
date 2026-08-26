import { QueryInterface, DataTypes } from 'sequelize';

/**
 * Migration: Add location and VPN detection fields to download_logs table
 * - location: Country/City detected from download IP
 * - isVpn: Whether download IP belongs to a VPN/proxy network
 */
export async function up(queryInterface: QueryInterface): Promise<void> {
  const table = await queryInterface.describeTable('download_logs');

  if (!table.location) {
    await queryInterface.addColumn('download_logs', 'location', {
      type: DataTypes.STRING(255),
      allowNull: true,
      defaultValue: null,
      comment: 'Country/City detected from download IP',
    });
    console.log('✅ Added location column to download_logs table');
  }

  if (!table.isVpn) {
    await queryInterface.addColumn('download_logs', 'isVpn', {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether download IP belongs to a VPN/proxy network',
    });
    console.log('✅ Added isVpn column to download_logs table');
  }
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.removeColumn('download_logs', 'location').catch(() => {});
  await queryInterface.removeColumn('download_logs', 'isVpn').catch(() => {});
  console.log('✅ Removed location/isVpn columns from download_logs table');
}
