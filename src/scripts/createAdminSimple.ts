import { User } from '../models';
import { initializeDatabase } from '../models';

/**
 * Simple script to create an admin user with command line arguments
 * Usage: npm run create-admin-simple <email> <password> <name>
 * Example: npm run create-admin-simple admin@example.com admin123 "Admin User"
 */

const createAdminUser = async () => {
  try {
    // Get arguments from command line
    const args = process.argv.slice(2);
    
    if (args.length < 3) {
      console.log('\n=== Create Admin User ===\n');
      console.log('Usage: npm run create-admin-simple <email> <password> <name>');
      console.log('Example: npm run create-admin-simple admin@example.com admin123456 "Admin User"');
      console.log('\n');
      process.exit(1);
    }

    const [email, password, name] = args;

    console.log('\n=== Creating Admin User ===\n');

    // Initialize database
    await initializeDatabase();

    // Validate input
    if (!email || !password || !name) {
      console.error('❌ Error: All fields are required');
      process.exit(1);
    }

    if (password.length < 8) {
      console.error('❌ Error: Password must be at least 8 characters');
      process.exit(1);
    }

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      console.error(`❌ Error: User with email "${email}" already exists`);
      process.exit(1);
    }

    // Create admin user
    const admin = await User.create({
      email,
      password,
      name,
      role: 'admin',
      isActive: true,
    });

    console.log('✅ Admin user created successfully!\n');
    console.log('Details:');
    console.log(`  ID: ${admin.id}`);
    console.log(`  Email: ${admin.email}`);
    console.log(`  Name: ${admin.name}`);
    console.log(`  Role: ${admin.role}`);
    console.log('\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error creating admin user:', error);
    process.exit(1);
  }
};

createAdminUser();
