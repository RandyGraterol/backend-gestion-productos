import * as fc from 'fast-check';
import { sequelize } from '../../config/database';
import { Product, Category } from '../../models';
import * as productService from '../productService';
import { ProductCreationAttributes } from '../../types';

/**
 * Property-Based Tests for Product Service
 * Using fast-check library for property testing
 */

describe('Product Service - Property Tests', () => {
  let testCategory: any;

  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  beforeEach(async () => {
    // Clean up all data before each test
    await Product.destroy({ where: {}, force: true });
    await Category.destroy({ where: {}, force: true });
    
    // Create a fresh test category for each test
    testCategory = await Category.create({
      name: 'Test Category',
      description: 'Category for testing',
    });
  });

  /**
   * Feature: inventory-backend-api, Property 2: Pagination consistency
   * Validates: Requirements 2.2
   * 
   * For any set of products in the database, retrieving paginated results should return 
   * non-overlapping subsets that together contain all products exactly once, and each 
   * product should include its category information.
   */
  describe('Property 2: Pagination consistency', () => {
    it('should return non-overlapping subsets that contain all products exactly once', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 20 }), // Number of products to create
          fc.integer({ min: 1, max: 5 }),  // Page size
          async (numProducts, pageSize) => {
            // Clean up products before this iteration
            await Product.destroy({ where: {}, force: true });
            
            // Create products with unique SKUs
            const timestamp = Date.now();
            const random = Math.random();
            const products: ProductCreationAttributes[] = [];
            for (let i = 0; i < numProducts; i++) {
              products.push({
                sku: `SKU-${timestamp}-${random}-${i}`,
                name: `Product ${i}`,
                categoryId: testCategory.id,
                unit: 'pcs',
                price: 10 + i,
                cost: 5 + i,
                stock: 100,
                minStock: 10,
              });
            }

            // Insert all products
            await Product.bulkCreate(products);

            // Retrieve all pages
            const allProductIds = new Set<string>();
            let currentPage = 1;
            let hasMore = true;

            while (hasMore) {
              const result = await productService.getAllProducts(currentPage, pageSize);
              
              // Check that each product has category information
              result.data.forEach(product => {
                expect(product).toHaveProperty('category');
                allProductIds.add(product.id);
              });

              // Check if there are more pages
              hasMore = currentPage < result.pagination.totalPages;
              currentPage++;
            }

            // Verify all products were retrieved exactly once
            expect(allProductIds.size).toBe(numProducts);
          }
        ),
        { numRuns: 50 } // Reduced for performance
      );
    }, 20000); // 20 second timeout
  });

  /**
   * Feature: inventory-backend-api, Property 3: Product retrieval completeness
   * Validates: Requirements 2.3
   * 
   * For any product ID that exists in the database, retrieving that product should return 
   * all product fields including all relationship data (category).
   */
  describe('Property 3: Product retrieval completeness', () => {
    it('should return complete product data including category relationship', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            sku: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
            name: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
            unit: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
            price: fc.float({ min: 0, max: 10000, noNaN: true }),
            cost: fc.float({ min: 0, max: 10000, noNaN: true }),
            stock: fc.integer({ min: 0, max: 10000 }),
            minStock: fc.integer({ min: 0, max: 1000 }),
            description: fc.option(fc.string({ maxLength: 500 }), { nil: undefined }),
            brand: fc.option(fc.string({ maxLength: 100 }), { nil: undefined }),
          }),
          async (productData) => {
            // Clean up
            await Product.destroy({ where: {}, force: true });
            
            // Create product
            const created = await Product.create({
              ...productData,
              sku: `SKU-${Date.now()}-${Math.random()}`,
              categoryId: testCategory.id,
            });

            // Retrieve product
            const retrieved = await productService.getProductById(created.id);

            // Verify all fields are present
            expect(retrieved.id).toBe(created.id);
            expect(retrieved.sku).toBe(created.sku);
            expect(retrieved.name).toBe(productData.name);
            expect(retrieved.unit).toBe(productData.unit);
            expect(retrieved.price).toBeCloseTo(productData.price, 2);
            expect(retrieved.cost).toBeCloseTo(productData.cost, 2);
            expect(retrieved.stock).toBe(productData.stock);
            expect(retrieved.minStock).toBe(productData.minStock);
            
            // Verify category relationship is loaded
            expect(retrieved).toHaveProperty('category');
            expect((retrieved as any).category).toBeDefined();
          }
        ),
        { numRuns: 50 } // Reduced for performance
      );
    }, 15000); // 15 second timeout
  });

  /**
   * Feature: inventory-backend-api, Property 4: Product update persistence
   * Validates: Requirements 2.4
   * 
   * For any existing product and valid update data, updating the product should result 
   * in the database containing the new values while preserving the product ID and 
   * creation timestamp.
   */
  describe('Property 4: Product update persistence', () => {
    it('should persist updates while preserving ID and creation timestamp', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
          fc.float({ min: 0, max: 10000, noNaN: true }),
          async (newName, newPrice) => {
            // Clean up
            await Product.destroy({ where: {}, force: true });
            
            // Create initial product
            const created = await Product.create({
              sku: `SKU-${Date.now()}-${Math.random()}`,
              name: 'Original Name',
              categoryId: testCategory.id,
              unit: 'pcs',
              price: 100,
              cost: 50,
              stock: 100,
              minStock: 10,
            });

            const originalId = created.id;
            const originalCreatedAt = created.createdAt;

            // Update product
            const updated = await productService.updateProduct(originalId, {
              name: newName,
              price: newPrice,
            });

            // Verify ID is preserved
            expect(updated.id).toBe(originalId);
            
            // Verify updates were applied
            expect(updated.name).toBe(newName);
            expect(updated.price).toBeCloseTo(newPrice, 2);
            
            // Verify creation timestamp is preserved
            expect(new Date(updated.createdAt).getTime()).toBe(originalCreatedAt.getTime());
          }
        ),
        { numRuns: 50 } // Reduced for performance
      );
    }, 15000); // 15 second timeout
  });

  /**
   * Feature: inventory-backend-api, Property 5: Product deletion removes record
   * Validates: Requirements 2.5
   * 
   * For any product that exists in the database, deleting that product should result 
   * in the product no longer being retrievable and returning a 204 status.
   */
  describe('Property 5: Product deletion removes record', () => {
    it('should remove product from database after deletion', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
          async (productName) => {
            // Clean up
            await Product.destroy({ where: {}, force: true });
            
            // Create product
            const created = await Product.create({
              sku: `SKU-${Date.now()}-${Math.random()}`,
              name: productName,
              categoryId: testCategory.id,
              unit: 'pcs',
              price: 100,
              cost: 50,
              stock: 100,
              minStock: 10,
            });

            const productId = created.id;

            // Delete product
            await productService.deleteProduct(productId);

            // Verify product is no longer retrievable
            await expect(productService.getProductById(productId)).rejects.toThrow('Product not found');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: inventory-backend-api, Property 7: Case-insensitive search matching
   * Validates: Requirements 2.7
   * 
   * For any set of products and search term, all returned products should contain 
   * the search term (case-insensitive) in either their name or SKU, and no products 
   * containing the term should be excluded.
   */
  describe('Property 7: Case-insensitive search matching', () => {
    it('should return all products matching search term case-insensitively', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 3, maxLength: 10 })
            .filter(s => s.trim().length >= 3)
            .filter(s => /^[a-zA-Z0-9]+$/.test(s)), // Only alphanumeric to avoid special chars
          fc.constantFrom('upper', 'lower', 'mixed'),
          async (searchBase, caseType) => {
            // Clean up
            await Product.destroy({ where: {}, force: true });
            
            // Create products with the search term in different cases
            const timestamp = Date.now();
            const random = Math.random();
            
            let searchTerm = searchBase;
            if (caseType === 'upper') {
              searchTerm = searchBase.toUpperCase();
            } else if (caseType === 'lower') {
              searchTerm = searchBase.toLowerCase();
            } else {
              // Mixed case
              searchTerm = searchBase.split('').map((c, i) => 
                i % 2 === 0 ? c.toUpperCase() : c.toLowerCase()
              ).join('');
            }

            // Create matching products
            const product1 = await Product.create({
              sku: `SKU-${timestamp}-${random}-1`,
              name: `Product with ${searchTerm} inside`,
              categoryId: testCategory.id,
              unit: 'pcs',
              price: 100,
              cost: 50,
              stock: 100,
              minStock: 10,
            });

            const product2 = await Product.create({
              sku: `${searchTerm}-${timestamp}-${random}-2`,
              name: 'Another Product XYZ',
              categoryId: testCategory.id,
              unit: 'pcs',
              price: 100,
              cost: 50,
              stock: 100,
              minStock: 10,
            });

            // Create non-matching product with completely different text
            await Product.create({
              sku: `NOMATCH-${timestamp}-${random}-3`,
              name: 'Completely Different Item',
              categoryId: testCategory.id,
              unit: 'pcs',
              price: 100,
              cost: 50,
              stock: 100,
              minStock: 10,
            });

            // Search with different case
            const searchQuery = caseType === 'upper' ? searchBase.toLowerCase() : searchBase.toUpperCase();
            const results = await productService.searchProducts(searchQuery);

            // Verify we got at least the 2 matching products
            expect(results.length).toBeGreaterThanOrEqual(2);
            
            // Verify all results contain the search term (case-insensitive)
            results.forEach(product => {
              const nameMatch = product.name.toLowerCase().includes(searchBase.toLowerCase());
              const skuMatch = product.sku.toLowerCase().includes(searchBase.toLowerCase());
              expect(nameMatch || skuMatch).toBe(true);
            });
            
            // Verify the specific products we created are in the results
            const resultIds = results.map(p => p.id);
            expect(resultIds).toContain(product1.id);
            expect(resultIds).toContain(product2.id);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
