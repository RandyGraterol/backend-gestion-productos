import * as fc from 'fast-check';
import { sequelize } from '../../config/database';
import Product from '../Product';
import Category from '../Category';

// Feature: inventory-backend-api, Property 1: Product creation round-trip
// Feature: inventory-backend-api, Property 6: SKU uniqueness constraint

describe('Product Model Property Tests', () => {
  let testCategory: Category;

  beforeAll(async () => {
    // Initialize database in memory for testing
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  beforeEach(async () => {
    // Clean up before each test
    await Product.destroy({ where: {}, truncate: true });
    await Category.destroy({ where: {}, truncate: true });

    // Create a test category for products
    testCategory = await Category.create({
      name: `TestCategory-${Date.now()}`,
      description: 'Test category for product tests',
    });
  });

  describe('Property 1: Product creation round-trip', () => {
    /**
     * For any valid product data, creating a product via the API and then
     * retrieving it from the database should return equivalent product data
     * with all fields preserved.
     * Validates: Requirements 2.1
     */
    it('should preserve all product data through create and retrieve cycle', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            sku: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
            name: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
            description: fc.option(fc.string({ maxLength: 500 }), { nil: undefined }),
            brand: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
            unit: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
            price: fc.double({ min: 0, max: 100000, noNaN: true }),
            cost: fc.double({ min: 0, max: 100000, noNaN: true }),
            stock: fc.integer({ min: 0, max: 10000 }),
            minStock: fc.integer({ min: 0, max: 1000 }),
            maxStock: fc.option(fc.integer({ min: 0, max: 10000 }), { nil: undefined }),
            location: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
            barcode: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
            imageUrl: fc.option(fc.webUrl(), { nil: undefined }),
          }),
          fc.uuid(),
          async (productData, uniqueId) => {
            // Make SKU unique
            const uniqueSku = `${productData.sku}-${uniqueId}`;

            // Create product
            const created = await Product.create({
              ...productData,
              sku: uniqueSku,
              categoryId: testCategory.id,
            });

            // Retrieve product
            const retrieved = await Product.findByPk(created.id);

            // Verify all fields are preserved
            expect(retrieved).not.toBeNull();
            expect(retrieved!.sku).toBe(uniqueSku);
            expect(retrieved!.name).toBe(productData.name);
            expect(retrieved!.description).toBe(productData.description ?? null);
            expect(retrieved!.brand).toBe(productData.brand ?? null);
            expect(retrieved!.unit).toBe(productData.unit);
            expect(retrieved!.price).toBeCloseTo(productData.price, 2);
            expect(retrieved!.cost).toBeCloseTo(productData.cost, 2);
            expect(retrieved!.stock).toBe(productData.stock);
            expect(retrieved!.minStock).toBe(productData.minStock);
            expect(retrieved!.maxStock).toBe(productData.maxStock ?? null);
            expect(retrieved!.location).toBe(productData.location ?? null);
            expect(retrieved!.barcode).toBe(productData.barcode ?? null);
            expect(retrieved!.imageUrl).toBe(productData.imageUrl ?? null);
            expect(retrieved!.categoryId).toBe(testCategory.id);
            expect(retrieved!.id).toBe(created.id);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 6: SKU uniqueness constraint', () => {
    /**
     * For any product with a specific SKU, attempting to create another product
     * with the same SKU should be rejected with a 409 status, regardless of
     * other field values.
     * Validates: Requirements 2.6
     */
    it('should reject duplicate SKU values', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            sku: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
            name: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
            unit: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
            price: fc.double({ min: 0, max: 100000, noNaN: true }),
            cost: fc.double({ min: 0, max: 100000, noNaN: true }),
            stock: fc.integer({ min: 0, max: 10000 }),
            minStock: fc.integer({ min: 0, max: 1000 }),
          }),
          fc.uuid(),
          async (productData, uniqueId) => {
            const uniqueSku = `${productData.sku}-${uniqueId}`;

            // Create first product
            await Product.create({
              ...productData,
              sku: uniqueSku,
              categoryId: testCategory.id,
            });

            // Attempt to create second product with same SKU but different name
            await expect(
              Product.create({
                ...productData,
                name: `Different-${productData.name}`,
                sku: uniqueSku, // Same SKU
                categoryId: testCategory.id,
              })
            ).rejects.toThrow();
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});
