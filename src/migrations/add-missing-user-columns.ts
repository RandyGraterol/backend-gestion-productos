import { QueryInterface, DataTypes } from 'sequelize';

/**
 * Migration: Add all potentially missing columns to users table
 * These columns are defined in the User model but may not exist in the database
 * if the original schema didn't include them.
 *
 * Columns added:
 * - phone: STRING for user phone number
 * - ownerId: UUID reference to users (for multi-tenant operators)
 * - businessType: ENUM for business type
 * - emailVerified: BOOLEAN for email verification status
 * - avatar: STRING for user avatar URL
 * - isActive: BOOLEAN for account active status
 * - plan: ENUM for subscription plan
 * - planStatus: ENUM for subscription status
 * - planExpiry: DATE for plan expiration
 * - trialStartDate: DATE for trial start
 */
export async function up(queryInterface: QueryInterface): Promise<void> {
  const table = await queryInterface.describeTable('users');

  // 1. phone
  if (!table.phone) {
    await queryInterface.addColumn('users', 'phone', {
      type: DataTypes.STRING(30),
      allowNull: true,
    });
    console.log('✅ Added phone column to users table');
  }

  // 2. ownerId — referenced by auth middleware and multi-tenant logic
  if (!table.ownerId) {
    await queryInterface.addColumn('users', 'ownerId', {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    });
    console.log('✅ Added ownerId column to users table');

    try {
      await queryInterface.addIndex('users', ['ownerId'], {
        name: 'idx_users_ownerId',
      });
      console.log('✅ Added index on ownerId');
    } catch {
      console.log('ℹ️  Index idx_users_ownerId already exists or skipped');
    }
  }

  // 3. businessType — ENUM (must create type first in PostgreSQL)
  if (!table.businessType) {
    try {
      await queryInterface.sequelize.query(
        `DO $$ BEGIN
          CREATE TYPE "enum_users_businessType" AS ENUM ('bodega', 'licoreria', 'abasto', 'supermercado', 'farmacia', 'otro');
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;`
      );
    } catch {
      // May already exist or not be PostgreSQL
    }

    await queryInterface.addColumn('users', 'businessType', {
      type: DataTypes.ENUM('bodega', 'licoreria', 'abasto', 'supermercado', 'farmacia', 'otro'),
      allowNull: true,
    });
    console.log('✅ Added businessType column to users table');
  }

  // 4. emailVerified
  if (!table.emailVerified) {
    await queryInterface.addColumn('users', 'emailVerified', {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
    console.log('✅ Added emailVerified column to users table');
  }

  // 5. avatar
  if (!table.avatar) {
    await queryInterface.addColumn('users', 'avatar', {
      type: DataTypes.STRING(500),
      allowNull: true,
    });
    console.log('✅ Added avatar column to users table');
  }

  // 6. isActive
  if (!table.isActive) {
    await queryInterface.addColumn('users', 'isActive', {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    });
    console.log('✅ Added isActive column to users table');
  }

  // 7. plan — ENUM
  if (!table.plan) {
    try {
      await queryInterface.sequelize.query(
        `DO $$ BEGIN
          CREATE TYPE "enum_users_plan" AS ENUM ('mensual', 'anual', 'lifetime');
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;`
      );
    } catch {
      // May already exist
    }

    await queryInterface.addColumn('users', 'plan', {
      type: DataTypes.ENUM('mensual', 'anual', 'lifetime'),
      allowNull: true,
      defaultValue: null,
    });
    console.log('✅ Added plan column to users table');
  }

  // 8. planStatus — ENUM
  if (!table.planStatus) {
    try {
      await queryInterface.sequelize.query(
        `DO $$ BEGIN
          CREATE TYPE "enum_users_planStatus" AS ENUM ('activo', 'pendiente', 'expirado');
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;`
      );
    } catch {
      // May already exist
    }

    await queryInterface.addColumn('users', 'planStatus', {
      type: DataTypes.ENUM('activo', 'pendiente', 'expirado'),
      allowNull: true,
      defaultValue: null,
    });
    console.log('✅ Added planStatus column to users table');
  }

  // 9. planExpiry
  if (!table.planExpiry) {
    await queryInterface.addColumn('users', 'planExpiry', {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
    });
    console.log('✅ Added planExpiry column to users table');
  }

  // 10. trialStartDate
  if (!table.trialStartDate) {
    await queryInterface.addColumn('users', 'trialStartDate', {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
    });
    console.log('✅ Added trialStartDate column to users table');
  }
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  const columns = [
    'phone', 'ownerId', 'businessType', 'emailVerified', 'avatar',
    'isActive', 'plan', 'planStatus', 'planExpiry', 'trialStartDate',
  ];
  for (const col of columns) {
    await queryInterface.removeColumn('users', col).catch(() => {});
  }
  console.log('✅ Removed missing user columns');
}
