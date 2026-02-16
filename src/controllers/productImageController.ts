import { Response } from 'express';
import { AuthRequest } from '../types';
import ProductImage from '../models/ProductImage';
import Product from '../models/Product';
import { getFileUrl, deleteUploadedFile } from '../config/multer';
import path from 'path';

/**
 * Upload images for a product
 * POST /api/products/:productId/images
 */
export const uploadImages = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { productId } = req.params;
    const files = req.files as Express.Multer.File[];

    // Validate that files were provided
    if (!files || files.length === 0) {
      res.status(400).json({
        success: false,
        error: 'No images provided. Please upload at least one image.',
      });
      return;
    }

    // Validate file types (additional check beyond multer)
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const invalidFiles = files.filter(file => !allowedMimeTypes.includes(file.mimetype));
    
    if (invalidFiles.length > 0) {
      // Clean up all uploaded files
      files.forEach((file) => {
        deleteUploadedFile(file.path);
      });
      
      res.status(400).json({
        success: false,
        error: `Invalid file type(s) detected. Only JPEG, PNG, GIF, and WebP images are allowed. Invalid files: ${invalidFiles.map(f => f.originalname).join(', ')}`,
      });
      return;
    }

    // Validate file sizes (5MB max per file)
    const maxFileSize = 5 * 1024 * 1024; // 5MB
    const oversizedFiles = files.filter(file => file.size > maxFileSize);
    
    if (oversizedFiles.length > 0) {
      // Clean up all uploaded files
      files.forEach((file) => {
        deleteUploadedFile(file.path);
      });
      
      res.status(400).json({
        success: false,
        error: `File size exceeds maximum allowed size of 5MB. Oversized files: ${oversizedFiles.map(f => `${f.originalname} (${(f.size / 1024 / 1024).toFixed(2)}MB)`).join(', ')}`,
      });
      return;
    }

    // Verify product exists
    const product = await Product.findByPk(productId);
    if (!product) {
      // Delete uploaded files if product doesn't exist
      files.forEach((file) => {
        deleteUploadedFile(file.path);
      });

      res.status(404).json({
        success: false,
        error: 'Product not found. Cannot upload images for non-existent product.',
      });
      return;
    }

    // Get current image count for this product
    const existingImagesCount = await ProductImage.count({
      where: { productId },
    });

    // Check if this is the first image (should be primary)
    const isFirstImage = existingImagesCount === 0;

    // Create image records
    try {
      const imageRecords = await Promise.all(
        files.map(async (file, index) => {
          const imageUrl = getFileUrl(req, file.filename);
          
          return await ProductImage.create({
            productId,
            imageUrl,
            fileName: file.filename,
            fileSize: file.size,
            mimeType: file.mimetype,
            isPrimary: isFirstImage && index === 0,
            displayOrder: existingImagesCount + index,
          });
        })
      );

      res.status(201).json({
        success: true,
        message: `${imageRecords.length} image(s) uploaded successfully`,
        data: imageRecords,
      });
    } catch (dbError) {
      console.error('Database error while saving images:', dbError);
      
      // Clean up uploaded files on database error
      files.forEach((file) => {
        deleteUploadedFile(file.path);
      });
      
      res.status(500).json({
        success: false,
        error: 'Failed to save image records to database. All uploaded files have been cleaned up.',
      });
    }
  } catch (error) {
    console.error('Error uploading images:', error);
    
    // Clean up uploaded files on error
    if (req.files) {
      const files = req.files as Express.Multer.File[];
      files.forEach((file) => {
        deleteUploadedFile(file.path);
      });
    }

    res.status(500).json({
      success: false,
      error: 'An unexpected error occurred while uploading images. Please try again.',
    });
  }
};

/**
 * Get all images for a product
 * GET /api/products/:productId/images
 */
export const getProductImages = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { productId } = req.params;

    // Verify product exists
    const product = await Product.findByPk(productId);
    if (!product) {
      res.status(404).json({
        success: false,
        error: 'Product not found',
      });
      return;
    }

    const images = await ProductImage.findAll({
      where: { productId },
      order: [
        ['isPrimary', 'DESC'],
        ['displayOrder', 'ASC'],
      ],
    });

    res.json({
      success: true,
      data: images,
    });
  } catch (error) {
    console.error('Error fetching product images:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch product images',
    });
  }
};

/**
 * Update image metadata
 * PUT /api/products/:productId/images/:imageId
 */
export const updateImage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { productId, imageId } = req.params;
    const { displayOrder } = req.body;

    const image = await ProductImage.findOne({
      where: { id: imageId, productId },
    });

    if (!image) {
      res.status(404).json({
        success: false,
        error: 'Image not found',
      });
      return;
    }

    if (displayOrder !== undefined) {
      image.displayOrder = displayOrder;
    }

    await image.save();

    res.json({
      success: true,
      message: 'Image updated successfully',
      data: image,
    });
  } catch (error) {
    console.error('Error updating image:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update image',
    });
  }
};

/**
 * Delete an image
 * DELETE /api/products/:productId/images/:imageId
 */
export const deleteImage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { productId, imageId } = req.params;

    // Find the image to delete
    const image = await ProductImage.findOne({
      where: { id: imageId, productId },
    });

    if (!image) {
      res.status(404).json({
        success: false,
        error: 'Image not found. The image may have already been deleted.',
      });
      return;
    }

    const wasPrimary = image.isPrimary;
    const filePath = path.join(__dirname, '../../uploads/products', image.fileName);

    // Delete the image record from database first
    await image.destroy();

    // If this was the primary image, promote the next image
    if (wasPrimary) {
      const nextImage = await ProductImage.findOne({
        where: { productId },
        order: [['displayOrder', 'ASC']],
      });

      if (nextImage) {
        nextImage.isPrimary = true;
        await nextImage.save();
        console.log(`Promoted image ${nextImage.id} to primary after deleting previous primary image`);
      }
    }

    // Try to delete physical file (non-blocking)
    try {
      deleteUploadedFile(filePath);
      console.log(`Successfully deleted physical file: ${image.fileName}`);
    } catch (fileError) {
      // Log error but don't fail the request since DB record is already deleted
      console.error(`Warning: Failed to delete physical file ${image.fileName}:`, fileError);
      console.error('Database record has been deleted, but physical file may still exist.');
    }

    res.json({
      success: true,
      message: 'Image deleted successfully',
      promotedImage: wasPrimary ? (await ProductImage.findOne({
        where: { productId, isPrimary: true },
      })) : undefined,
    });
  } catch (error) {
    console.error('Error deleting image:', error);
    res.status(500).json({
      success: false,
      error: 'An unexpected error occurred while deleting the image. Please try again.',
    });
  }
};

/**
 * Set an image as primary
 * PATCH /api/products/:productId/images/:imageId/primary
 */
export const setPrimaryImage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { productId, imageId } = req.params;

    // Find the image to set as primary
    const image = await ProductImage.findOne({
      where: { id: imageId, productId },
    });

    if (!image) {
      res.status(404).json({
        success: false,
        error: 'Image not found. Cannot set non-existent image as primary.',
      });
      return;
    }

    // Check if it's already primary
    if (image.isPrimary) {
      res.json({
        success: true,
        message: 'Image is already set as primary',
        data: image,
      });
      return;
    }

    // Remove primary flag from all images of this product
    await ProductImage.update(
      { isPrimary: false },
      { where: { productId } }
    );

    // Set this image as primary
    image.isPrimary = true;
    await image.save();

    console.log(`Set image ${imageId} as primary for product ${productId}`);

    res.json({
      success: true,
      message: 'Primary image set successfully',
      data: image,
    });
  } catch (error) {
    console.error('Error setting primary image:', error);
    res.status(500).json({
      success: false,
      error: 'An unexpected error occurred while setting primary image. Please try again.',
    });
  }
};

/**
 * Reorder images
 * PUT /api/products/:productId/images/reorder
 */
export const reorderImages = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { productId } = req.params;
    const { imageOrders } = req.body; // Array of { imageId, displayOrder }

    // Validate input format
    if (!Array.isArray(imageOrders)) {
      res.status(400).json({
        success: false,
        error: 'Invalid image orders format. Expected an array of {imageId, displayOrder} objects.',
      });
      return;
    }

    // Validate that all entries have required fields
    const invalidEntries = imageOrders.filter(
      entry => !entry.imageId || typeof entry.displayOrder !== 'number'
    );

    if (invalidEntries.length > 0) {
      res.status(400).json({
        success: false,
        error: 'Invalid image order entries. Each entry must have imageId and displayOrder (number).',
      });
      return;
    }

    // Verify product exists
    const product = await Product.findByPk(productId);
    if (!product) {
      res.status(404).json({
        success: false,
        error: 'Product not found.',
      });
      return;
    }

    // Update display order for each image
    await Promise.all(
      imageOrders.map(async ({ imageId, displayOrder }) => {
        await ProductImage.update(
          { displayOrder },
          { where: { id: imageId, productId } }
        );
      })
    );

    // Fetch updated images ordered correctly
    const updatedImages = await ProductImage.findAll({
      where: { productId },
      order: [
        ['isPrimary', 'DESC'],
        ['displayOrder', 'ASC'],
      ],
    });

    console.log(`Reordered ${imageOrders.length} images for product ${productId}`);

    res.json({
      success: true,
      message: 'Images reordered successfully',
      data: updatedImages,
    });
  } catch (error) {
    console.error('Error reordering images:', error);
    res.status(500).json({
      success: false,
      error: 'An unexpected error occurred while reordering images. Please try again.',
    });
  }
};
