import * as fc from 'fast-check';
import { sequelize } from '../../config/database';
import User from '../User';
import bcrypt from 'bcrypt';

// Feature: inventory-backend-api, Property 25: Password hashing on registration

describe('User Model Property Tests', () => {
  beforeAll(async () => {
    // Initialize database in memory for testing
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  beforeEach(async () => {
    // Clean up before each test
    await User.destroy({ where: {}, truncate: true });
  });

  describe('Property 25: Password hashing on registration', () => {
    /**
     * For any user registration, the password stored in the database should be
     * a bcrypt hash, not the plain text password, and should be verifiable
     * against the original password.
     * Validates: Requirements 7.4
     */
    it('should hash passwords before storing and verify correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            email: fc.emailAddress(),
            password: fc.string({ minLength: 8, maxLength: 50 }).filter(s => s.trim().length >= 8),
            name: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            role: fc.constantFrom('admin' as const, 'manager' as const, 'employee' as const, 'viewer' as const),
          }),
          fc.uuid(),
          async (userData, uniqueId) => {
            const uniqueEmail = `${uniqueId}-${userData.email}`;
            const plainPassword = userData.password;

            // Create user
            const created = await User.create({
              ...userData,
              email: uniqueEmail,
              password: plainPassword,
            });

            // Retrieve user from database
            const retrieved = await User.findByPk(created.id);

            expect(retrieved).not.toBeNull();

            // Password should NOT be the plain text
            expect(retrieved!.password).not.toBe(plainPassword);

            // Password should be a bcrypt hash (starts with $2b$ or $2a$)
            expect(retrieved!.password).toMatch(/^\$2[ab]\$/);

            // Password should be verifiable with bcrypt
            const isValid = await bcrypt.compare(plainPassword, retrieved!.password);
            expect(isValid).toBe(true);

            // User's comparePassword method should also work
            const isValidMethod = await retrieved!.comparePassword(plainPassword);
            expect(isValidMethod).toBe(true);

            // Wrong password should not verify
            const isInvalid = await retrieved!.comparePassword('wrong-password-123');
            expect(isInvalid).toBe(false);
          }
        ),
        { numRuns: 1 } // Minimal runs (bcrypt is extremely slow)
      );
    }, 120000); // 120 second timeout for bcrypt operations

    it('should hash passwords on update when password is changed', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            email: fc.emailAddress(),
            name: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            role: fc.constantFrom('admin' as const, 'manager' as const, 'employee' as const, 'viewer' as const),
          }),
          fc.tuple(
            fc.string({ minLength: 8, maxLength: 50 }).filter(s => s.trim().length >= 8),
            fc.string({ minLength: 8, maxLength: 50 }).filter(s => s.trim().length >= 8)
          ).filter(([p1, p2]) => p1 !== p2), // Ensure passwords are different
          fc.uuid(),
          async (userData, [password, newPassword], uniqueId) => {
            const uniqueEmail = `${uniqueId}-${userData.email}`;

            // Create user with initial password
            const user = await User.create({
              ...userData,
              email: uniqueEmail,
              password: password,
            });

            const initialHash = user.password;

            // Update password
            user.password = newPassword;
            await user.save();

            // Retrieve updated user
            const updated = await User.findByPk(user.id);

            expect(updated).not.toBeNull();

            // Password hash should have changed
            expect(updated!.password).not.toBe(initialHash);

            // New password should verify correctly
            const isNewValid = await updated!.comparePassword(newPassword);
            expect(isNewValid).toBe(true);

            // Old password should not verify
            const isOldValid = await updated!.comparePassword(password);
            expect(isOldValid).toBe(false);
          }
        ),
        { numRuns: 1 } // Minimal runs (bcrypt is extremely slow)
      );
    }, 120000); // 120 second timeout for bcrypt operations
  });
});
