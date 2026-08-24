import { Op } from 'sequelize';
import { Product, Category, ProductImage } from '../models';
import { ProductCreationAttributes, ProductAttributes, PaginatedResponse } from '../types';
import { AppError } from '../types';

/**
 * Clean product data before saving
 * Converts empty strings to null for optional fields
 */
const cleanProductData = (data: any): any => {
  const cleaned = { ...data };
  
  // Convert numeric fields from strings (FormData sends everything as strings)
  const numericFields = ['price', 'cost', 'stock', 'minStock', 'maxStock'];
  numericFields.forEach(field => {
    if (cleaned[field] !== undefined && cleaned[field] !== null && cleaned[field] !== '') {
      cleaned[field] = Number(cleaned[field]);
    }
  });

  // Convert empty strings to null for optional fields
  const optionalFields = ['description', 'brand', 'location', 'barcode', 'imageUrl', 'expiryDate', 'maxStock'];
  
  optionalFields.forEach(field => {
    if (cleaned[field] === '' || cleaned[field] === undefined) {
      cleaned[field] = null;
    }
  });
  
  // Special handling for expiryDate - ensure it's a valid date or null
  if (cleaned.expiryDate && cleaned.expiryDate !== null) {
    const date = new Date(cleaned.expiryDate);
    if (isNaN(date.getTime())) {
      cleaned.expiryDate = null;
    }
  }

  // Ensure currency is valid
  if (cleaned.currency && !['USD', 'VES'].includes(cleaned.currency)) {
    cleaned.currency = 'VES';
  }
  
  return cleaned;
};

/**
 * Generate a unique SKU automatically per user
 * Format: PRD-XXXXXX (6 alphanumeric chars from timestamp + random)
 */
const generateSKU = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const ts = Date.now().toString(36).toUpperCase().slice(-4);
  const rand = Array.from({ length: 2 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `PRD-${ts}${rand}`;
};

/**
 * Create a new product for a specific user
 * @param productData - Product creation data (must include userId)
 * @returns Created product
 */
export const createProduct = async (
  productData: ProductCreationAttributes
): Promise<ProductAttributes> => {
  try {
    // Clean the data
    const cleanedData = cleanProductData(productData);

    // Auto-generate SKU if not provided
    if (!cleanedData.sku) {
      let sku = generateSKU();
      // Ensure uniqueness within user (retry up to 5 times)
      for (let i = 0; i < 5; i++) {
        const existing = await Product.findOne({ where: { sku, userId: cleanedData.userId } });
        if (!existing) break;
        sku = generateSKU();
      }
      cleanedData.sku = sku;
    }

    // Verify category exists AND belongs to the same user
    const category = await Category.findOne({
      where: { id: cleanedData.categoryId, userId: cleanedData.userId },
    });
    if (!category) {
      throw new AppError('Category not found or does not belong to your inventory', 404);
    }

    const product = await Product.create(cleanedData);

    // Send real-time notification
    try {
      const { notifyProductCreated } = await import('./notificationService');
      notifyProductCreated(cleanedData.userId, cleanedData.name);
    } catch {
      // Notification failure shouldn't break product creation
    }

    return product.toJSON();
  } catch (error: any) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      throw new AppError('Ya existe un producto con ese código en tu inventario', 409);
    }
    throw error;
  }
};

/**
 * Get all products for a specific user with pagination and search
 * @param userId - User ID for isolation
 * @param page - Page number (default: 1)
 * @param limit - Items per page (default: 10)
 * @param search - Search term for name or SKU
 * @param categoryId - Filter by category ID
 * @returns Paginated products with category information
 */
export const getAllProducts = async (
  userId: string,
  page: number = 1,
  limit: number = 10,
  search?: string,
  categoryId?: string,
  isActive?: string
): Promise<PaginatedResponse<ProductAttributes>> => {
  const offset = (page - 1) * limit;

  // Build where clause - always filter by userId
  const where: any = { userId };

  if (search) {
    where[Op.or] = [
      { name: { [Op.like]: `%${search}%` } },
      { sku: { [Op.like]: `%${search}%` } },
      { brand: { [Op.like]: `%${search}%` } },
    ];
  }

  if (categoryId) {
    where.categoryId = categoryId;
  }

  if (isActive !== undefined) {
    where.isActive = isActive === 'true';
  }

  const { count, rows } = await Product.findAndCountAll({
    where,
    include: [
      {
        model: Category,
        as: 'category',
        attributes: ['id', 'name'],
      },
      {
        model: ProductImage,
        as: 'images',
        attributes: ['id', 'imageUrl', 'fileName', 'fileSize', 'mimeType', 'isPrimary', 'displayOrder'],
        required: false,
      },
    ],
    limit,
    offset,
    order: [
      ['name', 'ASC'],
      [{ model: ProductImage, as: 'images' }, 'isPrimary', 'DESC'],
      [{ model: ProductImage, as: 'images' }, 'displayOrder', 'ASC'],
    ],
  });

  return {
    data: rows.map(product => product.toJSON()),
    pagination: {
      page,
      limit,
      total: count,
      totalPages: Math.ceil(count / limit),
    },
  };
};

/**
 * Get product by ID for a specific user
 * @param id - Product ID
 * @param userId - User ID for isolation
 * @returns Product with category and images relationships
 */
export const getProductById = async (id: string, userId?: string): Promise<ProductAttributes> => {
  const where: any = { id };
  if (userId) where.userId = userId;

  const product = await Product.findOne({
    where,
    include: [
      {
        model: Category,
        as: 'category',
        attributes: ['id', 'name'],
      },
      {
        model: ProductImage,
        as: 'images',
        attributes: ['id', 'imageUrl', 'fileName', 'fileSize', 'mimeType', 'isPrimary', 'displayOrder'],
        required: false,
      },
    ],
    order: [
      [{ model: ProductImage, as: 'images' }, 'isPrimary', 'DESC'],
      [{ model: ProductImage, as: 'images' }, 'displayOrder', 'ASC'],
    ],
  });

  if (!product) {
    throw new AppError('Product not found', 404);
  }

  return product.toJSON();
};

/**
 * Update product for a specific user
 * @param id - Product ID
 * @param userId - User ID for isolation
 * @param updateData - Data to update
 * @returns Updated product
 */
export const updateProduct = async (
  id: string,
  updateData: Partial<ProductCreationAttributes>,
  userId?: string
): Promise<ProductAttributes> => {
  const where: any = { id };
  if (userId) where.userId = userId;

  const product = await Product.findOne({ where });

  if (!product) {
    throw new AppError('Product not found', 404);
  }

  // Clean the data
  const cleanedData = cleanProductData(updateData);

  // If updating categoryId, verify category exists and belongs to user
  if (cleanedData.categoryId && userId) {
    const category = await Category.findOne({
      where: { id: cleanedData.categoryId, userId },
    });
    if (!category) {
      throw new AppError('Category not found or does not belong to your inventory', 404);
    }
  }

  try {
    await product.update(cleanedData);
    
    // Reload with category
    await product.reload({
      include: [
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name'],
        },
        {
          model: ProductImage,
          as: 'images',
          attributes: ['id', 'imageUrl', 'fileName', 'fileSize', 'mimeType', 'isPrimary', 'displayOrder'],
          required: false,
        },
      ],
      order: [
        [{ model: ProductImage, as: 'images' }, 'isPrimary', 'DESC'],
        [{ model: ProductImage, as: 'images' }, 'displayOrder', 'ASC'],
      ],
    });

    return product.toJSON();
  } catch (error: any) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      throw new AppError('SKU already exists in your inventory', 409);
    }
    throw error;
  }
};

/**
 * Delete product for a specific user
 * @param id - Product ID
 * @param userId - User ID for isolation
 */
export const deleteProduct = async (id: string, userId?: string): Promise<void> => {
  const where: any = { id };
  if (userId) where.userId = userId;

  const product = await Product.findOne({ where });

  if (!product) {
    throw new AppError('Product not found', 404);
  }

  await product.destroy();
};

/**
 * Search products by name or SKU for a specific user
 * @param searchTerm - Search term
 * @param userId - User ID for isolation
 * @returns Array of matching products with images
 */
export const searchProducts = async (searchTerm: string, userId: string): Promise<ProductAttributes[]> => {
  const products = await Product.findAll({
    where: {
      userId,
      [Op.or]: [
        { name: { [Op.like]: `%${searchTerm}%` } },
        { sku: { [Op.like]: `%${searchTerm}%` } },
        { brand: { [Op.like]: `%${searchTerm}%` } },
      ],
    },
    include: [
      {
        model: Category,
        as: 'category',
        attributes: ['id', 'name'],
      },
      {
        model: ProductImage,
        as: 'images',
        attributes: ['id', 'imageUrl', 'fileName', 'fileSize', 'mimeType', 'isPrimary', 'displayOrder'],
        required: false,
      },
    ],
    limit: 50,
    order: [
      ['name', 'ASC'],
      [{ model: ProductImage, as: 'images' }, 'isPrimary', 'DESC'],
      [{ model: ProductImage, as: 'images' }, 'displayOrder', 'ASC'],
    ],
  });

  return products.map(product => product.toJSON());
};

/**
 * Get product by barcode for a specific user
 * @param barcode - Barcode to search for
 * @param userId - User ID for isolation
 * @returns Product with the matching barcode or null
 */
export const getProductByBarcode = async (barcode: string, userId: string): Promise<ProductAttributes | null> => {
  const normalizedBarcode = barcode.replace(/[\s\-]/g, '').toUpperCase();
  
  const product = await Product.findOne({
    where: {
      userId,
      barcode: normalizedBarcode,
    },
    include: [
      {
        model: Category,
        as: 'category',
        attributes: ['id', 'name'],
      },
      {
        model: ProductImage,
        as: 'images',
        attributes: ['id', 'imageUrl', 'fileName', 'fileSize', 'mimeType', 'isPrimary', 'displayOrder'],
        required: false,
      },
    ],
  });

  return product ? product.toJSON() : null;
};

/**
 * Get low stock products for a specific user
 * @param userId - User ID for isolation
 * @param limit - Max products to return
 * @returns Products with stock below minStock
 */
export const getLowStockProducts = async (userId: string, limit: number = 20): Promise<ProductAttributes[]> => {
  const products = await Product.findAll({
    where: {
      userId,
      isActive: true,
      [Op.and]: [
        { stock: { [Op.lte]: { [Op.col]: 'minStock' } } },
      ],
    },
    include: [
      {
        model: Category,
        as: 'category',
        attributes: ['id', 'name'],
      },
    ],
    order: [['stock', 'ASC']],
    limit,
  });

  return products.map(product => product.toJSON());
};

/**
 * Get top products by stock for a specific user
 * @param userId - User ID for isolation
 * @param limit - Max products to return
 * @returns Top products
 */
export const getTopProducts = async (userId: string, limit: number = 5): Promise<ProductAttributes[]> => {
  const products = await Product.findAll({
    where: { userId, isActive: true },
    order: [['stock', 'DESC']],
    limit,
  });

  return products.map(product => product.toJSON());
};
