import { QueryInterface, DataTypes } from 'sequelize';

/**
 * Migration: Add custom exchange rate fields to users table
 * - customExchangeRate: Manual exchange rate set by the user (Bs per USD)
 * - exchangeRateMode: 'auto' = use API rate, 'manual' = use customExchangeRate
 */
export async function up(queryInterface: QueryInterface): Promise<void> {
  const table = await queryInterface.describeTable('users');

  if (!table.customExchangeRate) {
    await queryInterface.addColumn('users', 'customExchangeRate', {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: null,
      comment: 'Manual exchange rate set by the user (Bs per USD)',
    });
    console.log('✅ Added customExchangeRate column to users table');
  }

  if (!table.exchangeRateMode) {
    await queryInterface.addColumn('users', 'exchangeRateMode', {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: 'auto',
      comment: 'auto = use API rate, manual = use customExchangeRate',
    });
    console.log('✅ Added exchangeRateMode column to users table');
  }

  // Clean up orphaned ENUM type if sync({ alter }) created it
  await queryInterface.sequelize.query(
    `DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_users_exchangeRateMode') THEN DROP TYPE "public"."enum_users_exchangeRateMode"; END IF; END $$;`
  ).catch(() => {});
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.removeColumn('users', 'customExchangeRate').catch(() => {});
  await queryInterface.removeColumn('users', 'exchangeRateMode').catch(() => {});
  console.log('✅ Removed exchange rate columns from users table');
}
