/**
 * ImageStorageService
 * Optimización con sharp + almacenamiento en Local o Cloudinary
 * según la preferencia del administrador (tabla app_settings).
 */

import sharp from 'sharp';
import { v2 as cloudinary } from 'cloudinary';
import path from 'path';
import fs from 'fs';
import { sequelize } from '../config/database';
import { deleteUploadedFile } from '../config/multer';
import { AppError } from '../types';

// ============================================
// CONFIGURACIÓN (app_settings)
// ============================================

export type StorageProvider = 'local' | 'cloudinary';

let providerCache: StorageProvider | null = null;

export const invalidateProviderCache = (): void => {
  providerCache = null;
};

export async function getStorageProvider(): Promise<StorageProvider> {
  if (providerCache) return providerCache;

  try {
    const [rows] = await sequelize.query(
      `SELECT value FROM app_settings WHERE key = 'image_storage' LIMIT 1;`
    );
    const value = (rows as Array<{ value: string }>)[0]?.value;
    providerCache = value === 'cloudinary' ? 'cloudinary' : 'local';
  } catch {
    providerCache = 'local';
  }

  return providerCache;
}

export async function setStorageProvider(provider: StorageProvider): Promise<void> {
  await sequelize.query(
    `INSERT INTO app_settings (key, value, "updatedAt") VALUES ('image_storage', :provider, NOW())
     ON CONFLICT (key) DO UPDATE SET value = :provider, "updatedAt" = NOW();`,
    { replacements: { provider } }
  );
  providerCache = provider;
}

export function isCloudinaryConfigured(): boolean {
  return !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
}

/** Configura el SDK la primera vez que se necesita */
function ensureCloudinaryConfigured(): void {
  if (!isCloudinaryConfigured()) {
    throw new AppError(
      'Cloudinary no está configurado. Define CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY y CLOUDINARY_API_SECRET.',
      503
    );
  }
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

// ============================================
// OPTIMIZACIÓN CON SHARP
// ============================================

export interface OptimizedImage {
  /** Imagen principal WebP (máx 1200px) */
  large: Buffer;
  /** Miniatura WebP 300px */
  thumb: Buffer;
}

/**
 * Optimiza cualquier imagen recibida:
 * - Rota según EXIF · redimensiona máx 1200px · convierte a WebP q80
 * - Genera miniatura 300px WebP q75
 */
export const optimizeImage = async (input: Buffer): Promise<OptimizedImage> => {
  const [large, thumb] = await Promise.all([
    sharp(input)
      .rotate() // respeta EXIF
      .resize({ width: 1200, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer(),
    sharp(input)
      .rotate()
      .resize({ width: 300, withoutEnlargement: true })
      .webp({ quality: 75 })
      .toBuffer(),
  ]);

  return { large, thumb };
};

// ============================================
// ALMACENAMIENTO POR PROVEEDOR
// ============================================

const CLOUDINARY_FOLDER = 'inventario/products';

export interface StoredImage {
  imageUrl: string;
  thumbnailUrl: string | null;
  storageProvider: StorageProvider;
  publicId?: string | null;
  thumbnailPublicId?: string | null;
  /** Nombre de archivo local (para borrado en disco) */
  localFileName?: string;
}

interface StoreInput {
  productId: string;
  index: number;
  originalName: string;
}

/** Guarda las imágenes optimizadas según el proveedor activo */
export const storeOptimizedImages = async (
  optimized: OptimizedImage,
  input: StoreInput,
  providerOverride?: StorageProvider
): Promise<StoredImage> => {
  const provider = providerOverride ?? (await getStorageProvider());

  if (provider === 'cloudinary') {
    ensureCloudinaryConfigured();

    const baseName = path.basename(input.originalName, path.extname(input.originalName))
      .replace(/[^a-zA-Z0-9_-]/g, '_');

    const [mainRes, thumbRes] = await Promise.all([
      cloudinary.uploader.upload(
        `data:image/webp;base64,${optimized.large.toString('base64')}`,
        {
          folder: `${CLOUDINARY_FOLDER}/${input.productId}`,
          public_id: `${baseName}-${Date.now()}-${input.index}`,
          format: 'webp',
        }
      ),
      cloudinary.uploader.upload(
        `data:image/webp;base64,${optimized.thumb.toString('base64')}`,
        {
          folder: `${CLOUDINARY_FOLDER}/${input.productId}/thumbs`,
          public_id: `thumb-${baseName}-${Date.now()}-${input.index}`,
          format: 'webp',
        }
      ),
    ]);

    return {
      imageUrl: mainRes.secure_url,
      thumbnailUrl: thumbRes.secure_url,
      storageProvider: 'cloudinary',
      publicId: mainRes.public_id,
      thumbnailPublicId: thumbRes.public_id,
    };
  }

  // ---- LOCAL ----
  const fileName = `${input.productId}-${Date.now()}-${input.index}.webp`;
  const thumbName = `thumb-${fileName}`;
  const dir = path.join(process.cwd(), 'uploads', 'products');
  fs.mkdirSync(dir, { recursive: true });

  fs.writeFileSync(path.join(dir, fileName), optimized.large);
  fs.writeFileSync(path.join(dir, thumbName), optimized.thumb);

  return {
    imageUrl: `/uploads/products/${fileName}`,
    thumbnailUrl: `/uploads/products/${thumbName}`,
    storageProvider: 'local',
    localFileName: fileName,
  };
};

/** Elimina archivos locales derivados de un nombre */
const deleteLocalByName = (fileName: string): void => {
  deleteUploadedFile(path.join(process.cwd(), 'uploads', 'products', fileName));
  deleteUploadedFile(path.join(process.cwd(), 'uploads', 'products', `thumb-${fileName}`));
};

/**
 * Elimina una imagen almacenada según su proveedor.
 * Las imágenes legacy sin storageProvider se tratan como locales.
 */
export const deleteStoredImage = async (image: {
  imageUrl: string;
  fileName: string;
  storageProvider?: string | null;
  publicId?: string | null;
  thumbnailPublicId?: string | null;
}): Promise<void> => {
  if (image.storageProvider === 'cloudinary') {
    ensureCloudinaryConfigured();
    const destroy = async (id?: string | null) => {
      if (!id) return;
      try {
        await cloudinary.uploader.destroy(id);
      } catch (e) {
        console.error('⚠️ No se pudo borrar de Cloudinary:', id, e);
      }
    };
    await destroy(image.publicId);
    await destroy(image.thumbnailPublicId);
    return;
  }

  // Local: borra por nombre de archivo si existe el patrón nuevo (WebP),
  // y además el original tal cual (imágenes legacy)
  deleteLocalByName(image.fileName);
  deleteUploadedFile(path.join(process.cwd(), 'uploads', 'products', image.fileName));
};
