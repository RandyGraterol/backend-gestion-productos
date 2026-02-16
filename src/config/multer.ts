import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';
import { config } from './env';

/**
 * Multer Configuration for Product Image Uploads
 */

/**
 * Get the absolute path for uploads directory
 * Works in both development (src/) and production (dist/)
 */
const getUploadsDir = (): string => {
  // Use UPLOAD_DIR from environment config
  const uploadDir = config.upload.dir;
  
  // If it's an absolute path, use it directly
  if (path.isAbsolute(uploadDir)) {
    return path.join(uploadDir, 'products');
  }
  
  // If it's a relative path, resolve it from the project root
  // In development: process.cwd() = /path/to/project
  // In production: process.cwd() = /path/to/project (same)
  return path.join(process.cwd(), uploadDir, 'products');
};

// Ensure uploads directory exists
const uploadsDir = getUploadsDir();
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log(`✅ Created uploads directory: ${uploadsDir}`);
}

// Configure storage
const storage = multer.diskStorage({
  destination: (_req: Request, _file: Express.Multer.File, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req: Request, file: Express.Multer.File, cb) => {
    // Generate unique filename: timestamp-randomstring-originalname
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    const nameWithoutExt = path.basename(file.originalname, ext);
    const sanitizedName = nameWithoutExt.replace(/[^a-zA-Z0-9]/g, '_');
    cb(null, `${sanitizedName}-${uniqueSuffix}${ext}`);
  },
});

// File filter - only allow images
const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowedMimeTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.'));
  }
};

// Multer upload configuration
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
    files: 10, // Maximum 10 files per request
  },
});

/**
 * Helper function to delete uploaded file
 */
export const deleteUploadedFile = (filePath: string): void => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.error('Error deleting file:', error);
  }
};

/**
 * Helper function to get file URL
 * Generates the correct URL for accessing uploaded images
 */
export const getFileUrl = (req: Request, filename: string): string => {
  const protocol = req.protocol;
  const host = req.get('host');
  return `${protocol}://${host}/uploads/products/${filename}`;
};

/**
 * Get the uploads directory path
 * Exported for use in other modules
 */
export const getUploadsDirectory = (): string => {
  return uploadsDir;
};
