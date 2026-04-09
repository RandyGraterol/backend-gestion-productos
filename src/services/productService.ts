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
  
  return cleaned;
};

/**
 * Generate a unique SKU automatically
 * Format: PRD-XXXXXX (6 alphanumeric chars from timestamp + random)
 */
const generateSKU = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const ts = Date.now().toString(36).toUpperCase().slice(-4);
  const rand = Array.from({ length: 2 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `PRD-${ts}${rand}`;
};

/**
 * Create a new product
 * @param productData - Product creation data
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
      // Ensure uniqueness (retry up to 5 times)
      for (let i = 0; i < 5; i++) {
        const existing = await Product.findOne({ where: { sku } });
        if (!existing) break;
        sku = generateSKU();
      }
      cleanedData.sku = sku;
    }

    // Verify category exists
    const category = await Category.findByPk(cleanedData.categoryId);
    if (!category) {
      throw new AppError('Category not found', 404);
    }

    const product = await Product.create(cleanedData);
    return product.toJSON();
  } catch (error: any) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      throw new AppError('Ya existe un producto con ese nombre o código', 409);
    }
    throw error;
  }
};

/**
 * Get all products with pagination and search
 * @param page - Page number (default: 1)
 * @param limit - Items per page (default: 10)
 * @param search - Search term for name or SKU
 * @param categoryId - Filter by category ID
 * @returns Paginated products with category information
 */
export const getAllProducts = async (
  page: number = 1,
  limit: number = 10,
  search?: string,
  categoryId?: string
): Promise<PaginatedResponse<ProductAttributes>> => {
  const offset = (page - 1) * limit;

  // Build where clause
  const where: any = {};

  if (search) {
    where[Op.or] = [
      { name: { [Op.like]: `%${search}%` } },
      { sku: { [Op.like]: `%${search}%` } },
    ];
  }

  if (categoryId) {
    where.categoryId = categoryId;
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
 * Get product by ID
 * @param id - Product ID
 * @returns Product with category and images relationships
 */
export const getProductById = async (id: string): Promise<ProductAttributes> => {
  const product = await Product.findByPk(id, {
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
 * Update product
 * @param id - Product ID
 * @param updateData - Data to update
 * @returns Updated product
 */
export const updateProduct = async (
  id: string,
  updateData: Partial<ProductCreationAttributes>
): Promise<ProductAttributes> => {
  const product = await Product.findByPk(id);

  if (!product) {
    throw new AppError('Product not found', 404);
  }

  // Clean the data
  const cleanedData = cleanProductData(updateData);

  // If updating categoryId, verify category exists
  if (cleanedData.categoryId) {
    const category = await Category.findByPk(cleanedData.categoryId);
    if (!category) {
      throw new AppError('Category not found', 404);
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
      throw new AppError('SKU already exists', 409);
    }
    throw error;
  }
};

/**
 * Delete product
 * @param id - Product ID
 */
export const deleteProduct = async (id: string): Promise<void> => {
  const product = await Product.findByPk(id);

  if (!product) {
    throw new AppError('Product not found', 404);
  }

  await product.destroy();
};

/**
 * Search products by name or SKU (case-insensitive)
 * @param searchTerm - Search term
 * @returns Array of matching products with images
 */
export const searchProducts = async (searchTerm: string): Promise<ProductAttributes[]> => {
  const products = await Product.findAll({
    where: {
      [Op.or]: [
        { name: { [Op.like]: `%${searchTerm}%` } },
        { sku: { [Op.like]: `%${searchTerm}%` } },
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
