import { Response, NextFunction } from 'express';
import fs from 'fs';
import { AuthRequest } from '../types';
import * as productService from '../services/productService';
import ProductImage from '../models/ProductImage';
import { deleteUploadedFile } from '../config/multer';
import { resolveTenantId, resolveTenantIdWithBypass } from '../utils/tenant';
import { optimizeImage, storeOptimizedImages } from '../services/imageStorageService';

/**
 * Create a new product with optional images
 * POST /api/products
 */
export const createHandler = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const uploadedFiles: Express.Multer.File[] = [];
  
  try {
    const userId = resolveTenantId(req.user!);
    if (!userId) {
      res.status(401).json({ success: false, error: 'User authentication required' });
      return;
    }

    // Extract files if present
    const files = req.files as Express.Multer.File[] | undefined;
    if (files) {
      uploadedFiles.push(...files);
    }
    
    // Add userId to product data
    const productData = { ...req.body, userId };
    const product = await productService.createProduct(productData);
    
    // Process images if any were uploaded
    if (uploadedFiles.length > 0) {
      try {
        const imageRecords = await Promise.all(
          uploadedFiles.map(async (file, index) => {
            const inputBuffer = fs.readFileSync(file.path);
            const optimized = await optimizeImage(inputBuffer);
            const stored = await storeOptimizedImages(
              optimized,
              { productId: product.id, index, originalName: file.originalname }
            );
            return await ProductImage.create({
              productId: product.id,
              imageUrl: stored.imageUrl,
              thumbnailUrl: stored.thumbnailUrl,
              storageProvider: stored.storageProvider,
              publicId: stored.publicId ?? null,
              thumbnailPublicId: stored.thumbnailPublicId ?? null,
              fileName: file.originalname,
              fileSize: optimized.large.length,
              mimeType: 'image/webp',
              isPrimary: index === 0,
              displayOrder: index,
            });
          })
        );

        // Clean up multer temp files
        uploadedFiles.forEach((file) => deleteUploadedFile(file.path));

        const productWithImages = await productService.getProductById(product.id, userId);

        res.status(201).json({
          success: true,
          data: productWithImages,
          message: `Product created successfully with ${imageRecords.length} image(s)`,
        });
      } catch (imageError) {
        // Rollback: delete the product
        await productService.deleteProduct(product.id, userId);
        uploadedFiles.forEach((file) => deleteUploadedFile(file.path));
        throw imageError;
      }
    } else {
      res.status(201).json({
        success: true,
        data: product,
        message: 'Product created successfully',
      });
    }
  } catch (error) {
    uploadedFiles.forEach((file) => deleteUploadedFile(file.path));
    next(error);
  }
};

/**
 * Get all products with pagination and search
 * GET /api/products
 */
export const getAllHandler = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = resolveTenantIdWithBypass(req.user!, req.query.tenantId as string | undefined);
    if (!userId) {
      res.status(401).json({ success: false, error: 'User authentication required' });
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;
    const categoryId = req.query.categoryId as string;
    const isActive = req.query.isActive as string;

    const result = await productService.getAllProducts(userId, page, limit, search, categoryId, isActive);

    res.status(200).json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get product by ID
 * GET /api/products/:id
 */
export const getByIdHandler = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = resolveTenantId(req.user!);
    const product = await productService.getProductById(req.params.id, userId);

    res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update product with optional new images
 * PUT /api/products/:id
 */
export const updateHandler = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const uploadedFiles: Express.Multer.File[] = [];
  
  try {
    const userId = resolveTenantId(req.user!);
    if (!userId) {
      res.status(401).json({ success: false, error: 'User authentication required' });
      return;
    }

    // Extract files if present
    const files = req.files as Express.Multer.File[] | undefined;
    if (files) {
      uploadedFiles.push(...files);
    }
    
    // Update product data
    await productService.updateProduct(req.params.id, req.body, userId);
    
    // Process new images if any were uploaded
    if (uploadedFiles.length > 0) {
      try {
        const currentImages = await ProductImage.findAll({
          where: { productId: req.params.id },
          order: [['displayOrder', 'DESC']],
        });

        const nextDisplayOrder = currentImages.length > 0
          ? currentImages[0].displayOrder + 1
          : 0;

        const hasPrimaryImage = currentImages.some(img => img.isPrimary);

        await Promise.all(
          uploadedFiles.map(async (file, index) => {
            const inputBuffer = fs.readFileSync(file.path);
            const optimized = await optimizeImage(inputBuffer);
            const stored = await storeOptimizedImages(
              optimized,
              { productId: req.params.id, index, originalName: file.originalname }
            );
            return await ProductImage.create({
              productId: req.params.id,
              imageUrl: stored.imageUrl,
              thumbnailUrl: stored.thumbnailUrl,
              storageProvider: stored.storageProvider,
              publicId: stored.publicId ?? null,
              thumbnailPublicId: stored.thumbnailPublicId ?? null,
              fileName: file.originalname,
              fileSize: optimized.large.length,
              mimeType: 'image/webp',
              isPrimary: !hasPrimaryImage && index === 0,
              displayOrder: nextDisplayOrder + index,
            });
          })
        );

        // Clean up multer temp files
        uploadedFiles.forEach((file) => deleteUploadedFile(file.path));
      } catch (imageError) {
        uploadedFiles.forEach((file) => deleteUploadedFile(file.path));
        console.error('Images could not be saved, but product was updated');
      }
    }
    
    const productWithImages = await productService.getProductById(req.params.id, userId);
    
    res.status(200).json({
      success: true,
      data: productWithImages,
      message: uploadedFiles.length > 0 
        ? `Product updated successfully with ${uploadedFiles.length} new image(s)`
        : 'Product updated successfully',
    });
  } catch (error) {
    uploadedFiles.forEach((file) => deleteUploadedFile(file.path));
    next(error);
  }
};

/**
 * Delete product
 * DELETE /api/products/:id
 */
export const deleteHandler = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = resolveTenantId(req.user!);
    await productService.deleteProduct(req.params.id, userId);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

/**
 * Search products
 * GET /api/products/search
 */
export const searchHandler = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = resolveTenantIdWithBypass(req.user!, req.query.tenantId as string | undefined);
    if (!userId) {
      res.status(401).json({ success: false, error: 'User authentication required' });
      return;
    }

    const searchTerm = req.query.q as string;

    if (!searchTerm) {
      res.status(400).json({
        success: false,
        error: 'Search term is required',
      });
      return;
    }

    const products = await productService.searchProducts(searchTerm, userId);

    res.status(200).json({
      success: true,
      data: products,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get product by barcode
 * GET /api/products/by-barcode
 */
export const getByBarcodeHandler = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = resolveTenantIdWithBypass(req.user!, req.query.tenantId as string | undefined);
    if (!userId) {
      res.status(401).json({ success: false, error: 'User authentication required' });
      return;
    }

    const barcode = req.query.barcode as string;
    
    if (!barcode) {
      res.status(400).json({
        success: false,
        error: 'Barcode is required',
      });
      return;
    }

    const product = await productService.getProductByBarcode(barcode, userId);

    if (!product) {
      res.status(404).json({
        success: false,
        error: 'Product not found with the specified barcode',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    next(error);
  }
};
