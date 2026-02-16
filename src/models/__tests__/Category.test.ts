import * as fc from 'fast-check';
import { sequelize } from '../../config/database';
import Category from '../Category';

// Feature: inventory-backend-api, Property 8: Category creation round-trip

describe('Category Model Property Tests', () => {
  beforeAll(async () => {
    // Initialize database in memory for testing
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  beforeEach(async () => {
    // Clean up before each test
    await Category.destroy({ where: {}, truncate: true });
  });

  describe('Property 9: Category hierarchy preservation', () => {
    /**
     * For any set of categories with parent-child relationships, retrieving all
     * categories should correctly represent the hierarchical structure with
     * parentId references intact.
     * Validates: Requirements 3.2
     */
    it('should preserve parent-child relationships in category hierarchy', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              name: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
              description: fc.option(fc.string({ maxLength: 500 }), { nil: undefined }),
            }),
            { minLength: 2, maxLength: 5 }
          ),
          async (categoriesData) => {
            // Create parent category
            const parent = await Category.create({
              name: `Parent-${Date.now()}-${Math.random()}`,
              description: categoriesData[0].description,
            });

            // Create child categories
            const children: Category[] = [];
            for (let i = 1; i < categoriesData.length; i++) {
              const child = await Category.create({
                name: `Child-${Date.now()}-${Math.random()}-${i}`,
                description: categoriesData[i].description,
                parentId: parent.id,
              });
              children.push(child);
            }

            // Retrieve all categories
            const allCategories = await Category.findAll();

            // Find parent in results
            const retrievedParent = allCategories.find(c => c.id === parent.id);
            expect(retrievedParent).toBeDefined();
            expect(retrievedParent!.parentId).toBeNull();

            // Verify all children have correct parentId
            for (const child of children) {
              const retrievedChild = allCategories.find(c => c.id === child.id);
              expect(retrievedChild).toBeDefined();
              expect(retrievedChild!.parentId).toBe(parent.id);
            }
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Property 8: Category creation round-trip', () => {
    /**
     * For any valid category data, creating a category via the API and then
     * retrieving it from the database should return equivalent category data.
     * Validates: Requirements 3.1
     */
    it('should preserve all category data through create and retrieve cycle', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            description: fc.option(fc.string({ maxLength: 500 }), { nil: undefined }),
            icon: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
            color: fc.option(
              fc.string({ minLength: 6, maxLength: 6 }).filter(s => /^[0-9A-F]{6}$/i.test(s)).map(hex => `#${hex.toUpperCase()}`),
              { nil: undefined }
            ),
          }),
          fc.uuid(),
          async (categoryData, uniqueId) => {
            // Make name unique by appending UUID
            const uniqueName = `${categoryData.name}-${uniqueId}`;

            // Create category with unique name
            const created = await Category.create({
              ...categoryData,
              name: uniqueName,
            });

            // Retrieve category
            const retrieved = await Category.findByPk(created.id);

            // Verify all fields are preserved
            expect(retrieved).not.toBeNull();
            expect(retrieved!.name).toBe(uniqueName);
            // Sequelize returns null for undefined optional fields
            expect(retrieved!.description).toBe(categoryData.description ?? null);
            expect(retrieved!.icon).toBe(categoryData.icon ?? null);
            expect(retrieved!.color).toBe(categoryData.color ?? null);
            expect(retrieved!.id).toBe(created.id);
          }
        ),
        { numRuns: 50 } // Reduced runs for performance
      );
    }, 20000); // 20 second timeout
  });
});
