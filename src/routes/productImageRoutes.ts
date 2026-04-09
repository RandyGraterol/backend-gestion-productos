import { Router } from 'express';
import { authenticate } from '../middleware/auth';

import { upload } from '../config/multer';
import * as productImageController from '../controllers/productImageController';

const router = Router();

/**
 * Product Image Routes
 * All routes require authentication
 */

// Upload images for a product (multiple files)
router.post(
  '/:productId/images',
  authenticate,
  upload.array('images', 10),
  productImageController.uploadImages
);

// Get all images for a product
router.get(
  '/:productId/images',
  authenticate,
  productImageController.getProductImages
);

// Update image (set as primary, change order)
router.put(
  '/:productId/images/:imageId',
  authenticate,
  productImageController.updateImage
);

// Delete an image
router.delete(
  '/:productId/images/:imageId',
  authenticate,
  productImageController.deleteImage
);

// Set primary image
router.patch(
  '/:productId/images/:imageId/primary',
  authenticate,
  productImageController.setPrimaryImage
);

// Reorder images
router.put(
  '/:productId/images/reorder',
  authenticate,
  productImageController.reorderImages
);

export default router;
