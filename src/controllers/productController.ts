import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import * as productService from '../services/productService';
import ProductImage from '../models/ProductImage';
import { getFileUrl, deleteUploadedFile } from '../config/multer';

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
    console.log('=== CREATE PRODUCT REQUEST ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('User:', req.user);
    console.log('Files:', req.files);
    
    // Extract files if present
    const files = req.files as Express.Multer.File[] | undefined;
    if (files) {
      uploadedFiles.push(...files);
    }
    
    // Create product first
    const product = await productService.createProduct(req.body);
    console.log('Product created successfully:', product.id);
    
    // Process images if any were uploaded
    if (uploadedFiles.length > 0) {
      console.log(`Processing ${uploadedFiles.length} image(s)...`);
      
      try {
        // Create image records
        const imageRecords = await Promise.all(
          uploadedFiles.map(async (file, index) => {
            const imageUrl = getFileUrl(req, file.filename);
            
            return await ProductImage.create({
              productId: product.id,
              imageUrl,
              fileName: file.filename,
              fileSize: file.size,
              mimeType: file.mimetype,
              isPrimary: index === 0, // First image is primary
              displayOrder: index,
            });
          })
        );
        
        console.log(`${imageRecords.length} image(s) saved successfully`);
        
        // Reload product with images
        const productWithImages = await productService.getProductById(product.id);
        
        res.status(201).json({
          success: true,
          data: productWithImages,
          message: `Product created successfully with ${imageRecords.length} image(s)`,
        });
      } catch (imageError) {
        console.error('Error saving images, rolling back product:', imageError);
        
        // Rollback: delete the product
        await productService.deleteProduct(product.id);
        
        // Clean up uploaded files
        uploadedFiles.forEach((file) => {
          deleteUploadedFile(file.path);
        });
        
        throw imageError;
      }
    } else {
      // No images, return product as is
      res.status(201).json({
        success: true,
        data: product,
        message: 'Product created successfully',
      });
    }
  } catch (error) {
    console.error('Error in createHandler:', error);
    
    // Clean up any uploaded files on error
    uploadedFiles.forEach((file) => {
      deleteUploadedFile(file.path);
    });
    
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
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;
    const categoryId = req.query.categoryId as string;

    const result = await productService.getAllProducts(page, limit, search, categoryId);

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
    const product = await productService.getProductById(req.params.id);

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
    console.log('=== UPDATE PRODUCT REQUEST ===');
    console.log('Product ID:', req.params.id);
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('Files:', req.files);
    
    // Extract files if present
    const files = req.files as Express.Multer.File[] | undefined;
    if (files) {
      uploadedFiles.push(...files);
    }
    
    // Update product data first
    const product = await productService.updateProduct(req.params.id, req.body);
    console.log('Product updated successfully:', product.id);
    
    // Process new images if any were uploaded
    if (uploadedFiles.length > 0) {
      console.log(`Processing ${uploadedFiles.length} new image(s)...`);
      
      try {
        // Get current images to determine next displayOrder
        const currentImages = await ProductImage.findAll({
          where: { productId: req.params.id },
          order: [['displayOrder', 'DESC']],
        });
        
        const nextDisplayOrder = currentImages.length > 0 
          ? currentImages[0].displayOrder + 1 
          : 0;
        
        // Check if product has any primary image
        const hasPrimaryImage = currentImages.some(img => img.isPrimary);
        
        // Create new image records
        const imageRecords = await Promise.all(
          uploadedFiles.map(async (file, index) => {
            const imageUrl = getFileUrl(req, file.filename);
            
            return await ProductImage.create({
              productId: req.params.id,
              imageUrl,
              fileName: file.filename,
              fileSize: file.size,
              mimeType: file.mimetype,
              isPrimary: !hasPrimaryImage && index === 0, // First new image is primary if no primary exists
              displayOrder: nextDisplayOrder + index,
            });
          })
        );
        
        console.log(`${imageRecords.length} image(s) saved successfully`);
      } catch (imageError) {
        console.error('Error saving images:', imageError);
        
        // Clean up uploaded files
        uploadedFiles.forEach((file) => {
          deleteUploadedFile(file.path);
        });
        
        // Don't fail the update, just log the error
        console.error('Images could not be saved, but product was updated');
      }
    }
    
    // Reload product with images
    const productWithImages = await productService.getProductById(req.params.id);
    
    res.status(200).json({
      success: true,
      data: productWithImages,
      message: uploadedFiles.length > 0 
        ? `Product updated successfully with ${uploadedFiles.length} new image(s)`
        : 'Product updated successfully',
    });
  } catch (error) {
    console.error('Error in updateHandler:', error);
    
    // Clean up any uploaded files on error
    uploadedFiles.forEach((file) => {
      deleteUploadedFile(file.path);
    });
    
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
    await productService.deleteProduct(req.params.id);

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
    const searchTerm = req.query.q as string;

    if (!searchTerm) {
      res.status(400).json({
        success: false,
        error: 'Search term is required',
      });
      return;
    }

    const products = await productService.searchProducts(searchTerm);

    res.status(200).json({
      success: true,
      data: products,
    });
  } catch (error) {
    next(error);
  }
};
