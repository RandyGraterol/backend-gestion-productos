/**
 * Seed Script - Create Admin User
 * Creates a single administrator user in the database
 * 
 * Usage:
 *   npm run seed:admin
 *   or
 *   npx ts-node src/scripts/seedAdmin.ts
 */

import { sequelize } from '../config/database';
import User from '../models/User';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
dotenv.config({ path: path.resolve(process.cwd(), envFile) });

/**
 * Admin user data
 * You can customize these values or use environment variables
 */
const ADMIN_DATA = {
  email: process.env.ADMIN_EMAIL || 'admin@inventario.com',
  password: process.env.ADMIN_PASSWORD || 'Admin123!',
  name: process.env.ADMIN_NAME || 'Administrador',
  role: 'admin' as const,
  isActive: true,
};

/**
 * Create admin user
 */
async function seedAdmin() {
  try {
    console.log('🌱 Starting admin user seed...\n');

    // Connect to database
    await sequelize.authenticate();
    console.log('✅ Database connection established');

    // Sync database (create tables if they don't exist)
    await sequelize.sync();
    console.log('✅ Database synchronized\n');

    // Check if admin user already exists
    const existingAdmin = await User.findOne({
      where: { email: ADMIN_DATA.email },
    });

    if (existingAdmin) {
      console.log('⚠️  Admin user already exists:');
      console.log(`   Email: ${existingAdmin.email}`);
      console.log(`   Name: ${existingAdmin.name}`);
      console.log(`   Role: ${existingAdmin.role}`);
      console.log(`   Active: ${existingAdmin.isActive}`);
      console.log('\n💡 If you want to reset the password, delete the user first or update it manually.\n');
      return;
    }

    // Create admin user
    const admin = await User.create(ADMIN_DATA);

    console.log('✅ Admin user created successfully!\n');
    console.log('📋 Admin User Details:');
    console.log('   ID:', admin.id);
    console.log('   Email:', admin.email);
    console.log('   Name:', admin.name);
    console.log('   Role:', admin.role);
    console.log('   Active:', admin.isActive);
    console.log('\n🔐 Login Credentials:');
    console.log('   Email:', ADMIN_DATA.email);
    console.log('   Password:', ADMIN_DATA.password);
    console.log('\n⚠️  IMPORTANT: Change the password after first login!\n');

  } catch (error) {
    console.error('❌ Error seeding admin user:', error);
    throw error;
  } finally {
    // Close database connection
    await sequelize.close();
    console.log('👋 Database connection closed');
  }
}

// Run seed if this file is executed directly
if (require.main === module) {
  seedAdmin()
    .then(() => {
      console.log('✅ Seed completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seed failed:', error);
      process.exit(1);
    });
}

export default seedAdmin;
