/**
 * Configuración de almacenamiento de imágenes (solo admin)
 */

import { Request, Response, NextFunction } from 'express';
import {
  getStorageProvider,
  setStorageProvider,
  isCloudinaryConfigured,
  type StorageProvider,
} from '../services/imageStorageService';
import { AppError } from '../types';

/**
 * GET /api/settings/image-storage
 */
export const getImageStorageHandler = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const provider = await getStorageProvider();
    const cloudinaryConfigured = isCloudinaryConfigured();

    res.status(200).json({
      success: true,
      data: {
        provider,
        cloudinaryConfigured,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/settings/image-storage
 * Body: { provider: 'local' | 'cloudinary' }
 */
export const updateImageStorageHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { provider } = req.body as { provider?: StorageProvider };

    if (provider !== 'local' && provider !== 'cloudinary') {
      res.status(400).json({
        success: false,
        error: "Provider debe ser 'local' o 'cloudinary'",
      });
      return;
    }

    if (provider === 'cloudinary' && !isCloudinaryConfigured()) {
      res.status(400).json({
        success: false,
        error:
          'No se puede activar Cloudinary: faltan las variables CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY o CLOUDINARY_API_SECRET en el entorno del servidor.',
      });
      return;
    }

    await setStorageProvider(provider);

    res.status(200).json({
      success: true,
      data: { provider, cloudinaryConfigured: isCloudinaryConfigured() },
      message:
        provider === 'cloudinary'
          ? 'Las nuevas imágenes se subirán a Cloudinary.'
          : 'Las nuevas imágenes se guardarán en el servidor.',
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, error: error.message });
      return;
    }
    next(error);
  }
};
