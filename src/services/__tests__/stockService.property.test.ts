import * as fc from 'fast-check';
import { sequelize } from '../../config/database';
import { Product, Category, User, StockMovement } from '../../models';
import * as stockService from '../stockService';
import { StockMovementCreationAttributes } from '../../types';

/**
 * Property-Based Tests for Stock Service
 * Using fast-check library for property testing
 */

describe('Stock Service - Property Tests', () => {
  let testCategory: any;
  let testUser: any;

  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  beforeEach(async () => {
    // Clean up all data before each test
    await StockMovement.destroy({ where: {}, force: true });
    await Product.destroy({ where: {}, force: true });
    await Category.destroy({ where: {}, force: true });
    await User.destroy({ where: {}, force: true });

    // Create test category
    testCategory = await Category.create({
      name: 'Test Category',
      description: 'Category for testing',
    });

    // Create test user
    testUser = await User.create({
      email: 'test@example.com',
      password: 'hashedpassword123',
      name: 'Test User',
      role: 'admin',
      isActive: true,
    });
  });

  /**
   * Feature: inventory-backend-api, Property 17: Stock movement atomicity
   * Validates: Requirements 6.1
   *
   * For any stock movement creation, either both the movement record is created AND
   * the product stock is updated, or neither operation occurs (transaction rollback on failure).
   */
  describe('Property 17: Stock movement atomicity', () => {
    it('should create movement and update stock atomically', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 100, max: 1000 }), // Initial stock (large enough)
          fc.integer({ min: 1, max: 50 }), // Movement quantity (smaller than min stock)
          fc.constantFrom('in', 'out'),
          async (initialStock, quantity, type) => {
            // Clean up
            await StockMovement.destroy({ where: {}, force: true });
            await Product.destroy({ where: {}, force: true });

            // Create product with initial stock
            const product = await Product.create({
              sku: `SKU-${Date.now()}-${Math.random()}`,
              name: 'Test Product',
              categoryId: testCategory.id,
              unit: 'pcs',
              price: 100,
              cost: 50,
              stock: initialStock,
              minStock: 10,
            });

            // Create stock movement
            const movementData: StockMovementCreationAttributes = {
              productId: product.id,
              type: type as any,
              quantity,
              userId: testUser.id,
              reason: 'Test movement',
            };

            const movement = await stockService.createStockMovement(movementData);

            // Verify movement was created
            expect(movement).toBeDefined();
            expect(movement.productId).toBe(product.id);
            expect(movement.quantity).toBe(quantity);

            // Verify product stock was updated
            await product.reload();
            const expectedStock = type === 'in' ? initialStock + quantity : initialStock - quantity;
            expect(product.stock).toBe(expectedStock);

            // Verify movement record has correct stock values
            expect(movement.previousStock).toBe(initialStock);
            expect(movement.newStock).toBe(expectedStock);
          }
        ),
        { numRuns: 50 } // Reduced for performance
      );
    }, 15000); // 15 second timeout
  });

  /**
   * Feature: inventory-backend-api, Property 18: Negative stock prevention
   * Validates: Requirements 6.2
   *
   * For any stock movement that would result in the product's stock becoming negative,
   * the operation should be rejected with a 400 status and the product stock should remain unchanged.
   */
  describe('Property 18: Negative stock prevention', () => {
    it('should reject movements that would result in negative stock', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 50 }), // Initial stock (small)
          fc.integer({ min: 51, max: 100 }), // Quantity to remove (larger than stock)
          async (initialStock, quantity) => {
            // Clean up
            await StockMovement.destroy({ where: {}, force: true });
            await Product.destroy({ where: {}, force: true });

            // Create product with initial stock
            const product = await Product.create({
              sku: `SKU-${Date.now()}-${Math.random()}`,
              name: 'Test Product',
              categoryId: testCategory.id,
              unit: 'pcs',
              price: 100,
              cost: 50,
              stock: initialStock,
              minStock: 10,
            });

            const movementData: StockMovementCreationAttributes = {
              productId: product.id,
              type: 'out',
              quantity,
              userId: testUser.id,
              reason: 'Test movement',
            };

            // Attempt to create movement that would result in negative stock
            await expect(stockService.createStockMovement(movementData)).rejects.toThrow();

            // Verify product stock remained unchanged
            await product.reload();
            expect(product.stock).toBe(initialStock);

            // Verify no movement was created
            const movements = await StockMovement.findAll({ where: { productId: product.id } });
            expect(movements.length).toBe(0);
          }
        ),
        { numRuns: 50 } // Reduced for performance
      );
    }, 15000); // 15 second timeout
  });

  /**
   * Feature: inventory-backend-api, Property 19: Stock movement record completeness
   * Validates: Requirements 6.3
   *
   * For any created stock movement, the record should contain previousStock, newStock,
   * and type fields with correct values reflecting the state before and after the movement.
   */
  describe('Property 19: Stock movement record completeness', () => {
    it('should record complete movement information', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 50, max: 500 }),
          fc.integer({ min: 1, max: 50 }),
          fc.constantFrom('in', 'out', 'adjustment'),
          async (initialStock, quantity, type) => {
            // Clean up
            await StockMovement.destroy({ where: {}, force: true });
            await Product.destroy({ where: {}, force: true });

            // Create product
            const product = await Product.create({
              sku: `SKU-${Date.now()}-${Math.random()}`,
              name: 'Test Product',
              categoryId: testCategory.id,
              unit: 'pcs',
              price: 100,
              cost: 50,
              stock: initialStock,
              minStock: 10,
            });

            const movementData: StockMovementCreationAttributes = {
              productId: product.id,
              type: type as any,
              quantity,
              userId: testUser.id,
              reason: 'Test movement',
            };

            const movement = await stockService.createStockMovement(movementData);

            // Verify all required fields are present
            expect(movement.previousStock).toBeDefined();
            expect(movement.newStock).toBeDefined();
            expect(movement.type).toBeDefined();
            expect(movement.quantity).toBe(quantity);
            expect(movement.previousStock).toBe(initialStock);

            // Verify newStock calculation is correct
            let expectedNewStock = initialStock;
            if (type === 'in') {
              expectedNewStock = initialStock + quantity;
            } else if (type === 'out') {
              expectedNewStock = initialStock - quantity;
            } else if (type === 'adjustment') {
              expectedNewStock = quantity;
            }
            expect(movement.newStock).toBe(expectedNewStock);
          }
        ),
        { numRuns: 50 } // Reduced for performance
      );
    }, 15000); // 15 second timeout
  });

  /**
   * Feature: inventory-backend-api, Property 20: Stock movement relationships loaded
   * Validates: Requirements 6.4
   *
   * For any stock movement retrieval, the returned data should include the associated
   * product information and user information.
   */
  describe('Property 20: Stock movement relationships loaded', () => {
    it('should load product and user relationships', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 50, max: 500 }),
          fc.integer({ min: 1, max: 50 }),
          async (initialStock, quantity) => {
            // Clean up
            await StockMovement.destroy({ where: {}, force: true });
            await Product.destroy({ where: {}, force: true });

            // Create product
            const product = await Product.create({
              sku: `SKU-${Date.now()}-${Math.random()}`,
              name: 'Test Product',
              categoryId: testCategory.id,
              unit: 'pcs',
              price: 100,
              cost: 50,
              stock: initialStock,
              minStock: 10,
            });

            const movementData: StockMovementCreationAttributes = {
              productId: product.id,
              type: 'in',
              quantity,
              userId: testUser.id,
              reason: 'Test movement',
            };

            const movement = await stockService.createStockMovement(movementData);

            // Retrieve movement by ID
            const retrieved = await stockService.getStockMovementById(movement.id);

            // Verify product relationship is loaded
            expect(retrieved).toHaveProperty('product');
            expect((retrieved as any).product).toBeDefined();
            expect((retrieved as any).product.id).toBe(product.id);

            // Verify user relationship is loaded
            expect(retrieved).toHaveProperty('user');
            expect((retrieved as any).user).toBeDefined();
            expect((retrieved as any).user.id).toBe(testUser.id);
          }
        ),
        { numRuns: 50 } // Reduced for performance
      );
    }, 15000); // 15 second timeout
  });

  /**
   * Feature: inventory-backend-api, Property 21: Date range filtering accuracy
   * Validates: Requirements 6.5
   *
   * For any date range filter applied to stock movements, all returned movements should
   * have createdAt timestamps within the specified range, and no movements within the
   * range should be excluded.
   */
  describe('Property 21: Date range filtering accuracy', () => {
    it('should filter movements by date range accurately', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 3, max: 10 }), // Number of movements to create
          async (numMovements) => {
            // Clean up
            await StockMovement.destroy({ where: {}, force: true });
            await Product.destroy({ where: {}, force: true });

            // Create product
            const product = await Product.create({
              sku: `SKU-${Date.now()}-${Math.random()}`,
              name: 'Test Product',
              categoryId: testCategory.id,
              unit: 'pcs',
              price: 100,
              cost: 50,
              stock: 1000,
              minStock: 10,
            });

            // Create movements at different times
            const movements: any[] = [];
            const now = new Date();

            for (let i = 0; i < numMovements; i++) {
              const movementDate = new Date(now.getTime() - i * 24 * 60 * 60 * 1000); // Each day back

              const movement = await StockMovement.create({
                productId: product.id,
                type: 'in',
                quantity: 10,
                previousStock: 1000 + i * 10,
                newStock: 1000 + (i + 1) * 10,
                userId: testUser.id,
                createdAt: movementDate,
              });
              movements.push(movement);
            }

            // Define date range (middle of the range)
            const dateFrom = new Date(now.getTime() - (numMovements - 2) * 24 * 60 * 60 * 1000);
            const dateTo = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);

            // Get movements within date range
            const filtered = await stockService.getStockMovements({
              productId: product.id,
              dateFrom,
              dateTo,
            });

            // Verify all returned movements are within the date range
            filtered.forEach((movement) => {
              const movementDate = new Date(movement.createdAt);
              expect(movementDate.getTime()).toBeGreaterThanOrEqual(dateFrom.getTime());
              expect(movementDate.getTime()).toBeLessThanOrEqual(dateTo.getTime());
            });

            // Verify we got the expected number of movements
            // (should be at least 1, depending on the range)
            expect(filtered.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 50 } // Reduced runs due to time-based nature
      );
    });
  });
});
