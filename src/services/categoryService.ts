import { Category, Product } from '../models';
import { CategoryCreationAttributes, CategoryAttributes } from '../types';
import { AppError } from '../types';

/**
 * Create a new category
 * @param categoryData - Category creation data
 * @returns Created category
 */
export const createCategory = async (
  categoryData: CategoryCreationAttributes
): Promise<CategoryAttributes> => {
  try {
    const category = await Category.create(categoryData);
    return category.toJSON();
  } catch (error: any) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      throw new AppError('Category name already exists', 409);
    }
    throw error;
  }
};

/**
 * Get all categories with hierarchical relationships
 * @returns Array of all categories
 */
export const getAllCategories = async (): Promise<CategoryAttributes[]> => {
  const categories = await Category.findAll({
    include: [
      {
        model: Category,
        as: 'parent',
        attributes: ['id', 'name'],
      },
      {
        model: Category,
        as: 'children',
        attributes: ['id', 'name'],
      },
    ],
    order: [['name', 'ASC']],
  });

  return categories.map(cat => cat.toJSON());
};

/**
 * Get category by ID
 * @param id - Category ID
 * @returns Category with relationships
 */
export const getCategoryById = async (id: string): Promise<CategoryAttributes> => {
  const category = await Category.findByPk(id, {
    include: [
      {
        model: Category,
        as: 'parent',
        attributes: ['id', 'name'],
      },
      {
        model: Category,
        as: 'children',
        attributes: ['id', 'name'],
      },
    ],
  });

  if (!category) {
    throw new AppError('Category not found', 404);
  }

  return category.toJSON();
};

/**
 * Update category
 * @param id - Category ID
 * @param updateData - Data to update
 * @returns Updated category
 */
export const updateCategory = async (
  id: string,
  updateData: Partial<CategoryCreationAttributes>
): Promise<CategoryAttributes> => {
  const category = await Category.findByPk(id);

  if (!category) {
    throw new AppError('Category not found', 404);
  }

  try {
    await category.update(updateData);
    return category.toJSON();
  } catch (error: any) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      throw new AppError('Category name already exists', 409);
    }
    throw error;
  }
};

/**
 * Delete category
 * Checks if category has associated products before deletion
 * @param id - Category ID
 */
export const deleteCategory = async (id: string): Promise<void> => {
  const category = await Category.findByPk(id);

  if (!category) {
    throw new AppError('Category not found', 404);
  }

  // Check if category has associated products
  const productCount = await Product.count({
    where: { categoryId: id },
  });

  if (productCount > 0) {
    throw new AppError(
      `Cannot delete category with ${productCount} associated product(s)`,
      400
    );
  }

  await category.destroy();
};
