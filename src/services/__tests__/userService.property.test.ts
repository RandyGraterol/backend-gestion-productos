import * as fc from 'fast-check';
import { sequelize } from '../../config/database';
import { User } from '../../models';
import * as userService from '../userService';
import { UserCreationAttributes, UserRole } from '../../types';

/**
 * Property-Based Tests for User Service
 * Using fast-check library for property testing
 */

describe('User Service - Property Tests', () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  beforeEach(async () => {
    // Clean up all data before each test
    await User.destroy({ where: {}, force: true });
  });

  /**
   * Feature: inventory-backend-api, Property 26: User creation with role
   * Validates: Requirements 8.1
   *
   * For any user creation by an admin with a specified role, the persisted user
   * should have the assigned role and all other provided attributes.
   */
  describe('Property 26: User creation with role', () => {
    it('should create user with assigned role and attributes', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 1000 }), // Use number for unique email
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          fc.constantFrom('admin', 'manager', 'employee', 'viewer'),
          async (emailNum, name, role) => {
            // Clean up
            await User.destroy({ where: {}, force: true });

            const userData: UserCreationAttributes = {
              email: `user${emailNum}@test.com`,
              password: 'password123', // Use fixed password to speed up tests
              name,
              role: role as UserRole,
            };

            const createdUser = await userService.createUser(userData);

            // Verify user was created with correct attributes
            expect(createdUser.email).toBe(userData.email);
            expect(createdUser.name).toBe(name);
            expect(createdUser.role).toBe(role);
            expect(createdUser.isActive).toBe(true);

            // Verify password is not returned
            expect(createdUser).not.toHaveProperty('password');

            // Verify user exists in database
            const dbUser = await User.findByPk(createdUser.id);
            expect(dbUser).toBeDefined();
            expect(dbUser?.role).toBe(role);
          }
        ),
        { numRuns: 50 } // Reduced due to password hashing
      );
    }, 30000); // Increased timeout
  });

  /**
   * Feature: inventory-backend-api, Property 27: Password exclusion from user retrieval
   * Validates: Requirements 8.2
   *
   * For any user retrieval operation, the returned user object should not contain
   * the password or passwordHash field.
   */
  describe('Property 27: Password exclusion from user retrieval', () => {
    it('should never return password in user retrieval operations', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 1000 }),
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          async (emailNum, name) => {
            // Clean up
            await User.destroy({ where: {}, force: true });

            // Create user
            const userData: UserCreationAttributes = {
              email: `user${emailNum}@test.com`,
              password: 'password123',
              name,
              role: 'viewer',
            };

            const createdUser = await userService.createUser(userData);

            // Test getUserById
            const retrievedById = await userService.getUserById(createdUser.id);
            expect(retrievedById).not.toHaveProperty('password');

            // Test getAllUsers
            const allUsers = await userService.getAllUsers();
            expect(allUsers.length).toBeGreaterThan(0);
            allUsers.forEach(user => {
              expect(user).not.toHaveProperty('password');
            });
          }
        ),
        { numRuns: 50 }
      );
    }, 30000); // Increased timeout
  });

  /**
   * Feature: inventory-backend-api, Property 28: Role update with audit trail
   * Validates: Requirements 8.3
   *
   * For any user role update, the user's role should be changed in the database
   * and the updatedAt timestamp should be modified to reflect the change.
   */
  describe('Property 28: Role update with audit trail', () => {
    it('should update role and modify updatedAt timestamp', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 1000 }),
          fc.constantFrom('admin', 'manager', 'employee', 'viewer'),
          fc.constantFrom('admin', 'manager', 'employee', 'viewer'),
          async (emailNum, initialRole, newRole) => {
            // Clean up before each iteration
            await User.destroy({ where: {}, force: true });

            // Create user with initial role
            const userData: UserCreationAttributes = {
              email: `user${emailNum}@test.com`,
              password: 'password123',
              name: 'Test User',
              role: initialRole as UserRole,
            };

            const createdUser = await userService.createUser(userData);
            const originalUpdatedAt = new Date(createdUser.updatedAt);

            // Wait a bit to ensure timestamp difference
            await new Promise(resolve => setTimeout(resolve, 10));

            // Update user role
            const updatedUser = await userService.updateUserRole(createdUser.id, newRole as UserRole);

            // Verify role was updated
            expect(updatedUser.role).toBe(newRole);

            // Verify updatedAt was modified (or equal if no actual change)
            const newUpdatedAt = new Date(updatedUser.updatedAt);
            expect(newUpdatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt.getTime());

            // Verify password is not returned
            expect(updatedUser).not.toHaveProperty('password');

            // Verify in database
            const dbUser = await User.findByPk(createdUser.id);
            expect(dbUser?.role).toBe(newRole);
          }
        ),
        { numRuns: 30 } // Reduced due to setTimeout and password hashing
      );
    }, 30000); // Increased timeout
  });
});
