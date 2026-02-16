import { User } from '../models';
import { initializeDatabase } from '../models';
import * as readline from 'readline';

/**
 * Script to create an admin user
 * Usage: npm run create-admin
 */

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (query: string): Promise<string> => {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
};

const createAdminUser = async () => {
  try {
    console.log('\n=== Create Admin User ===\n');

    // Initialize database
    await initializeDatabase();

    // Get admin details
    const email = await question('Admin Email: ');
    const password = await question('Admin Password: ');
    const name = await question('Admin Name: ');

    // Validate input
    if (!email || !password || !name) {
      console.error('\n❌ Error: All fields are required');
      process.exit(1);
    }

    if (password.length < 8) {
      console.error('\n❌ Error: Password must be at least 8 characters');
      process.exit(1);
    }

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      console.error('\n❌ Error: User with this email already exists');
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

    console.log('\n✅ Admin user created successfully!');
    console.log('\nDetails:');
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
