import { Op } from 'sequelize';
import { Category, Product } from '../models';
import { CategoryCreationAttributes, CategoryAttributes } from '../types';
import { AppError } from '../types';

/**
 * Create a new category for a specific user
 * @param categoryData - Category creation data (must include userId)
 * @returns Created category
 */
export const createCategory = async (
  categoryData: CategoryCreationAttributes
): Promise<CategoryAttributes> => {
  try {
    // Check if user already has a category with this name
    const existing = await Category.findOne({
      where: { userId: categoryData.userId, name: categoryData.name },
    });
    if (existing) {
      throw new AppError('Ya existe una categoría con ese nombre en tu inventario', 409);
    }

    // If parentId is set, verify it belongs to the same user
    if (categoryData.parentId) {
      const parent = await Category.findOne({
        where: { id: categoryData.parentId, userId: categoryData.userId },
      });
      if (!parent) {
        throw new AppError('Category parent not found or does not belong to your inventory', 404);
      }
    }

    const category = await Category.create(categoryData);
    return category.toJSON();
  } catch (error: any) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      throw new AppError('Ya existe una categoría con ese nombre en tu inventario', 409);
    }
    throw error;
  }
};

/**
 * Get all categories for a specific user with hierarchical relationships
 * @param userId - User ID for isolation
 * @returns Array of all categories
 */
export const getAllCategories = async (
  userId: string,
  page: number = 1,
  limit: number = 50,
  search?: string
): Promise<{ data: CategoryAttributes[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> => {
  const offset = (page - 1) * limit;
  const where: any = { userId };

  if (search) {
    where[Op.or] = [
      { name: { [Op.like]: `%${search}%` } },
      { description: { [Op.like]: `%${search}%` } },
    ];
  }

  const { count, rows } = await Category.findAndCountAll({
    where,
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
    limit,
    offset,
  });

  return {
    data: rows.map(cat => cat.toJSON()),
    pagination: {
      page,
      limit,
      total: count,
      totalPages: Math.ceil(count / limit),
    },
  };
};

/**
 * Get category by ID for a specific user
 * @param id - Category ID
 * @param userId - User ID for isolation
 * @returns Category with relationships
 */
export const getCategoryById = async (id: string, userId?: string): Promise<CategoryAttributes> => {
  const where: any = { id };
  if (userId) where.userId = userId;

  const category = await Category.findOne({
    where,
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
 * Update category for a specific user
 * @param id - Category ID
 * @param userId - User ID for isolation
 * @param updateData - Data to update
 * @returns Updated category
 */
export const updateCategory = async (
  id: string,
  updateData: Partial<CategoryCreationAttributes>,
  userId?: string
): Promise<CategoryAttributes> => {
  const where: any = { id };
  if (userId) where.userId = userId;

  const category = await Category.findOne({ where });

  if (!category) {
    throw new AppError('Category not found', 404);
  }

  // Check if name already exists for this user
  if (updateData.name && userId) {
    const existing = await Category.findOne({
      where: { userId, name: updateData.name, id: { [Symbol.for('ne')]: id } },
    });
    if (existing) {
      throw new AppError('Ya existe una categoría con ese nombre en tu inventario', 409);
    }
  }

  // If updating parentId, verify it belongs to the same user
  if (updateData.parentId && userId) {
    const parent = await Category.findOne({
      where: { id: updateData.parentId, userId },
    });
    if (!parent) {
      throw new AppError('Category parent not found or does not belong to your inventory', 404);
    }
    // Prevent circular reference
    if (updateData.parentId === id) {
      throw new AppError('A category cannot be its own parent', 400);
    }
  }

  try {
    await category.update(updateData);
    return category.toJSON();
  } catch (error: any) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      throw new AppError('Ya existe una categoría con ese nombre en tu inventario', 409);
    }
    throw error;
  }
};

/**
 * Delete category for a specific user
 * Checks if category has associated products before deletion
 * @param id - Category ID
 * @param userId - User ID for isolation
 */
export const deleteCategory = async (id: string, userId?: string): Promise<void> => {
  const where: any = { id };
  if (userId) where.userId = userId;

  const category = await Category.findOne({ where });

  if (!category) {
    throw new AppError('Category not found', 404);
  }

  // Check if category has associated products for this user
  const productWhere: any = { categoryId: id };
  if (userId) productWhere.userId = userId;

  const productCount = await Product.count({ where: productWhere });

  if (productCount > 0) {
    throw new AppError(
      `Cannot delete category with ${productCount} associated product(s)`,
      400
    );
  }

  await category.destroy();
};

/**
 * Default categories to seed for new users
 */
const DEFAULT_CATEGORIES = [
  { name: 'Electrónica', description: 'Dispositivos y gadgets electrónicos', icon: 'phone-portrait-outline', color: '#3B82F6' },
  { name: 'Ropa y Moda', description: 'Vestimenta, calzado y accesorios', icon: 'shirt-outline', color: '#EC4899' },
  { name: 'Alimentos y Bebidas', description: 'Productos alimenticios y bebidas', icon: 'nutrition-outline', color: '#22C55E' },
  { name: 'Hogar y Decoración', description: 'Artículos para el hogar y decoración', icon: 'home-outline', color: '#F59E0B' },
  { name: 'Salud y Belleza', description: 'Productos de cuidado personal y salud', icon: 'heart-outline', color: '#EF4444' },
  { name: 'Deportes y Fitness', description: 'Artículos deportivos y equipment', icon: 'football-outline', color: '#8B5CF6' },
  { name: 'Herramientas', description: 'Herramientas manuales y eléctricas', icon: 'wrench-outline', color: '#6366F1' },
  { name: 'Juguetes y Juegos', description: 'Juguetes, juegos y entretenimiento', icon: 'game-controller-outline', color: '#06B6D4' },
  { name: 'Libros y Papelería', description: 'Material de lectura y oficina', icon: 'book-outline', color: '#14B8A6' },
  { name: 'Automotriz', description: 'Accesorios y repuestos para vehículos', icon: 'car-outline', color: '#64748B' },
  { name: 'Mascotas', description: 'Alimentos y accesorios para mascotas', icon: 'paw-outline', color: '#F97316' },
  { name: 'Tecnología', description: 'Computadoras, tablets y accesorios tech', icon: 'laptop-outline', color: '#0EA5E9' },
  { name: 'Jardín y Exterior', description: 'Plantas, herramientas de jardín y outdoor', icon: 'leaf-outline', color: '#84CC16' },
  { name: 'Bebés y Niños', description: 'Productos para bebés y niños pequeños', icon: 'gift-outline', color: '#E11D48' },
  { name: 'Música y Audio', description: 'Instrumentos,音响 y accesorios musicales', icon: 'musical-notes-outline', color: '#A855F7' },
  { name: 'Fotografía y Video', description: 'Cámaras, lentes y equipo de grabación', icon: 'camera-outline', color: '#D946EF' },
  { name: 'Construcción', description: 'Materiales y suministros de construcción', icon: 'construct-outline', color: '#78716C' },
  { name: 'Farmacia', description: 'Medicamentos y productos farmacéuticos', icon: 'medkit-outline', color: '#DC2626' },
  { name: 'Suministros de Oficina', description: 'Artículos y equipos para oficina', icon: 'cube-outline', color: '#475569' },
  { name: 'Otros', description: 'Productos que no encajan en otras categorías', icon: 'folder-outline', color: '#9CA3AF' },
];

/**
 * Seed default categories for a specific user
 * Only creates categories that don't already exist for the user
 * @param userId - User ID to seed categories for
 * @returns Number of categories created
 */
export const seedDefaultCategories = async (userId: string): Promise<number> => {
  try {
    // Check if user already has categories
    const existingCount = await Category.count({ where: { userId } });
    if (existingCount > 0) {
      return 0; // User already has categories, skip seeding
    }

    // Create all default categories for this user
    const categoriesToCreate = DEFAULT_CATEGORIES.map(cat => ({
      ...cat,
      userId,
    }));

    await Category.bulkCreate(categoriesToCreate);
    console.log(`✅ Seeded ${DEFAULT_CATEGORIES.length} default categories for user ${userId}`);
    return DEFAULT_CATEGORIES.length;
  } catch (error) {
    console.error('Error seeding default categories:', error);
    return 0;
  }
};

/**
 * Seed default categories for all existing users who have no categories
 * Called on server startup to ensure all users have default categories
 */
export const seedDefaultCategoriesForAllUsers = async (): Promise<number> => {
  try {
    const { User } = await import('../models');
    const users = await User.findAll({ attributes: ['id'] });
    let totalSeeded = 0;

    for (const user of users) {
      const seeded = await seedDefaultCategories(user.id);
      totalSeeded += seeded;
    }

    if (totalSeeded > 0) {
      console.log(`✅ Total default categories seeded: ${totalSeeded}`);
    } else {
      console.log('ℹ️  All users already have categories, no seeding needed');
    }

    return totalSeeded;
  } catch (error) {
    console.error('Error seeding default categories for all users:', error);
    return 0;
  }
};
