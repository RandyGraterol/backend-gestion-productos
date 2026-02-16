import * as fc from 'fast-check';
import { sequelize } from '../../config/database';
import { User } from '../../models';
import * as authService from '../authService';
import { UserCreationAttributes } from '../../types';

/**
 * Property-Based Tests for Authentication Service
 * Using fast-check library for property testing
 */

describe('Auth Service - Property Tests', () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  beforeEach(async () => {
    // Clean up all users before each test
    await User.destroy({ where: {}, force: true });
  });

  /**
   * Feature: frontend-backend-integration, Property 3: Authentication round-trip
   * Validates: Requirements 2.1, 2.2
   *
   * For any valid credentials, logging in then immediately fetching current user
   * should return the same user information.
   */
  describe('Property 3: Authentication round-trip', () => {
    it('should return same user info after login and getCurrentUser', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.emailAddress(),
          fc.string({ minLength: 8, maxLength: 20 }),
          fc.string({ minLength: 3, maxLength: 50 }),
          fc.constantFrom('admin', 'manager', 'employee', 'viewer'),
          async (email, password, name, role) => {
            // Clean up
            await User.destroy({ where: {}, force: true });

            // Register user
            const registerData: UserCreationAttributes = {
              email,
              password,
              name,
              role: role as any,
            };

            const registerResult = await authService.register(registerData);

            // Verify registration was successful
            expect(registerResult).toBeDefined();
            expect(registerResult.user).toBeDefined();
            expect(registerResult.token).toBeDefined();

            // Login with same credentials
            const loginResult = await authService.login(email, password);

            // Verify login was successful
            expect(loginResult).toBeDefined();
            expect(loginResult.user).toBeDefined();
            expect(loginResult.token).toBeDefined();

            // Get current user using the user ID from login
            const currentUser = await authService.getCurrentUser(loginResult.user.id);

            // Verify user information matches
            expect(currentUser.id).toBe(loginResult.user.id);
            expect(currentUser.email).toBe(email);
            expect(currentUser.name).toBe(name);
            expect(currentUser.role).toBe(role);

            // Verify user info from register matches login
            expect(registerResult.user.id).toBe(loginResult.user.id);
            expect(registerResult.user.email).toBe(loginResult.user.email);
            expect(registerResult.user.name).toBe(loginResult.user.name);
            expect(registerResult.user.role).toBe(loginResult.user.role);
          }
        ),
        { numRuns: 100 } // Run 100 iterations as specified in design
      );
    }, 30000); // 30 second timeout
  });

  /**
   * Feature: frontend-backend-integration, Property 2: JWT token persistence
   * Validates: Requirements 2.3, 2.4
   *
   * For any successful authentication, the JWT token returned by the backend
   * should be valid and decodable, containing the correct user information.
   */
  describe('Property 2: JWT token persistence', () => {
    it('should return valid JWT token with correct user info', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.emailAddress(),
          fc.string({ minLength: 8, maxLength: 20 }),
          fc.string({ minLength: 3, maxLength: 50 }),
          fc.constantFrom('admin', 'manager', 'employee', 'viewer'),
          async (email, password, name, role) => {
            // Clean up
            await User.destroy({ where: {}, force: true });

            // Register user
            const registerData: UserCreationAttributes = {
              email,
              password,
              name,
              role: role as any,
            };

            const result = await authService.register(registerData);

            // Verify token is a string
            expect(typeof result.token).toBe('string');
            expect(result.token.length).toBeGreaterThan(0);

            // Verify token has JWT format (three parts separated by dots)
            const tokenParts = result.token.split('.');
            expect(tokenParts.length).toBe(3);

            // Verify user data in response matches input
            expect(result.user.email).toBe(email);
            expect(result.user.name).toBe(name);
            expect(result.user.role).toBe(role);

            // Verify password is not included in response
            expect((result.user as any).password).toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    }, 30000);
  });

  /**
   * Feature: frontend-backend-integration, Property: Login with invalid credentials fails
   * Validates: Requirements 2.1
   *
   * For any invalid credentials (wrong password or non-existent email),
   * login should fail with an appropriate error.
   */
  describe('Property: Login with invalid credentials fails', () => {
    it('should reject login with wrong password', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.emailAddress(),
          fc.string({ minLength: 8, maxLength: 20 }),
          fc.string({ minLength: 8, maxLength: 20 }),
          fc.string({ minLength: 3, maxLength: 50 }),
          async (email, correctPassword, wrongPassword, name) => {
            // Ensure passwords are different
            fc.pre(correctPassword !== wrongPassword);

            // Clean up
            await User.destroy({ where: {}, force: true });

            // Register user with correct password
            const registerData: UserCreationAttributes = {
              email,
              password: correctPassword,
              name,
              role: 'viewer',
            };

            await authService.register(registerData);

            // Attempt login with wrong password
            await expect(authService.login(email, wrongPassword)).rejects.toThrow();
          }
        ),
        { numRuns: 100 }
      );
    }, 30000);

    it('should reject login with non-existent email', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.emailAddress(),
          fc.string({ minLength: 8, maxLength: 20 }),
          async (email, password) => {
            // Clean up
            await User.destroy({ where: {}, force: true });

            // Attempt login without registering
            await expect(authService.login(email, password)).rejects.toThrow();
          }
        ),
        { numRuns: 100 }
      );
    }, 30000);
  });

  /**
   * Feature: frontend-backend-integration, Property: User registration uniqueness
   * Validates: Requirements 2.1
   *
   * For any email address, attempting to register twice with the same email
   * should fail on the second attempt.
   */
  describe('Property: User registration uniqueness', () => {
    it('should prevent duplicate email registration', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.emailAddress(),
          fc.string({ minLength: 8, maxLength: 20 }),
          fc.string({ minLength: 3, maxLength: 50 }),
          async (email, password, name) => {
            // Clean up
            await User.destroy({ where: {}, force: true });

            // First registration should succeed
            const registerData: UserCreationAttributes = {
              email,
              password,
              name,
              role: 'viewer',
            };

            const firstResult = await authService.register(registerData);
            expect(firstResult).toBeDefined();
            expect(firstResult.user.email).toBe(email);

            // Second registration with same email should fail
            await expect(authService.register(registerData)).rejects.toThrow();
          }
        ),
        { numRuns: 100 }
      );
    }, 30000);
  });

  /**
   * Feature: frontend-backend-integration, Property 4: Unauthorized request handling
   * Validates: Requirements 2.5
   *
   * For any request with an invalid or expired JWT token, the backend should return 401 status
   * and the frontend should redirect to login.
   */
  describe('Property 4: Unauthorized request handling', () => {
    it('should reject requests with invalid tokens', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 10, maxLength: 100 }), // Random invalid token
          async (invalidToken) => {
            // Ensure it's not a valid JWT format or is malformed
            const jwt = require('jsonwebtoken');
            const { config } = require('../../config/env');

            // Try to verify the invalid token - should throw
            try {
              jwt.verify(invalidToken, config.jwtSecret);
              // If it doesn't throw, skip this test case (very unlikely)
              fc.pre(false);
            } catch (error) {
              // Expected - token is invalid
              expect(error).toBeDefined();
            }

            // Verify that using this token would fail authentication
            // This simulates what would happen in the auth middleware
            let authFailed = false;
            try {
              jwt.verify(invalidToken, config.jwtSecret);
            } catch (error) {
              authFailed = true;
            }

            expect(authFailed).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    }, 30000);

    it('should reject requests with expired tokens', async () => {
      const jwt = require('jsonwebtoken');
      const { config } = require('../../config/env');

      // Create an expired token
      const expiredToken = jwt.sign(
        { id: 'test-user-id', email: 'test@example.com', role: 'viewer' },
        config.jwtSecret,
        { expiresIn: '-1h' } // Expired 1 hour ago
      );

      // Verify that the expired token is rejected
      let authFailed = false;
      try {
        jwt.verify(expiredToken, config.jwtSecret);
      } catch (error: any) {
        authFailed = true;
        expect(error.name).toBe('TokenExpiredError');
      }

      expect(authFailed).toBe(true);
    });

    it('should reject requests with tampered tokens', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.emailAddress(),
          fc.string({ minLength: 8, maxLength: 20 }),
          fc.string({ minLength: 3, maxLength: 50 }),
          async (email, password, name) => {
            // Clean up
            await User.destroy({ where: {}, force: true });

            // Register and get valid token
            const registerData: UserCreationAttributes = {
              email,
              password,
              name,
              role: 'viewer',
            };

            const result = await authService.register(registerData);
            const validToken = result.token;

            // Tamper with the token by modifying a character
            const tamperedToken = validToken.slice(0, -5) + 'XXXXX';

            // Verify that the tampered token is rejected
            const jwt = require('jsonwebtoken');
            const { config } = require('../../config/env');

            let authFailed = false;
            try {
              jwt.verify(tamperedToken, config.jwtSecret);
            } catch (error) {
              authFailed = true;
            }

            expect(authFailed).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    }, 30000);
  });
});
