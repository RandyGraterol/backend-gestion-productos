import AppVersion from '../models/AppVersion';
import path from 'path';
import fs from 'fs';
import { deleteUploadedFile } from '../config/multer';
import { AppError } from '../types';

export interface CreateAppVersionInput {
  version: string;
  releaseName: string;
  releaseNotes: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType?: string;
  uploadedBy?: string;
}

export interface AppVersionStats {
  totalVersions: number;
  totalDownloads: number;
  latestVersion: {
    id: string;
    version: string;
    releaseName: string;
    downloadCount: number;
    createdAt: Date;
  } | null;
}

/**
 * Get all active versions ordered by creation date (newest first)
 */
export const getAllVersions = async (): Promise<AppVersion[]> => {
  return AppVersion.findAll({
    where: { isActive: true },
    order: [['createdAt', 'DESC']],
  });
};

/**
 * Get all versions including inactive (admin)
 */
export const getAllVersionsAdmin = async (): Promise<AppVersion[]> => {
  return AppVersion.findAll({
    order: [['createdAt', 'DESC']],
  });
};

/**
 * Get latest active version
 */
export const getLatestVersion = async (): Promise<AppVersion | null> => {
  return AppVersion.findOne({
    where: { isActive: true },
    order: [['createdAt', 'DESC']],
  });
};

/**
 * Get a single version by id
 */
export const getVersionById = async (id: string): Promise<AppVersion | null> => {
  return AppVersion.findByPk(id);
};

/**
 * Create a new app version
 */
export const createVersion = async (input: CreateAppVersionInput): Promise<AppVersion> => {
  const existing = await AppVersion.findOne({
    where: { version: input.version, isActive: true },
  });

  if (existing) {
    throw new AppError(`La versión ${input.version} ya existe`, 409);
  }

  return AppVersion.create({
    version: input.version,
    releaseName: input.releaseName,
    releaseNotes: input.releaseNotes,
    fileName: input.fileName,
    filePath: input.filePath,
    fileSize: input.fileSize,
    mimeType: input.mimeType || 'application/vnd.android.package-archive',
    uploadedBy: input.uploadedBy,
    downloadCount: 0,
    isActive: true,
  });
};

/**
 * Increment download counter and return the version
 */
export const incrementDownloadCount = async (id: string): Promise<AppVersion | null> => {
  const appVersion = await AppVersion.findByPk(id);

  if (!appVersion || !appVersion.isActive) {
    return null;
  }

  await appVersion.increment('downloadCount');
  await appVersion.reload();

  return appVersion;
};

/**
 * Soft-delete a version (marks inactive and removes the file)
 */
export const deleteVersion = async (id: string): Promise<boolean> => {
  const appVersion = await AppVersion.findByPk(id);

  if (!appVersion) {
    return false;
  }

  // Remove physical file
  const absolutePath = resolveFilePath(appVersion.filePath);
  if (fs.existsSync(absolutePath)) {
    deleteUploadedFile(absolutePath);
  }

  await appVersion.destroy();
  return true;
};

/**
 * Aggregate download statistics (admin dashboard)
 */
export const getVersionStats = async (): Promise<AppVersionStats> => {
  const [totalVersions, totalDownloadsRow, latest] = await Promise.all([
    AppVersion.count(),
    AppVersion.sum('downloadCount'),
    getLatestVersion(),
  ]);

  return {
    totalVersions,
    totalDownloads: (totalDownloadsRow as number) || 0,
    latestVersion: latest
      ? {
          id: latest.id,
          version: latest.version,
          releaseName: latest.releaseName,
          downloadCount: latest.downloadCount,
          createdAt: latest.createdAt,
        }
      : null,
  };
};

/**
 * Resolve a stored relative file path to an absolute path
 */
export const resolveFilePath = (storedPath: string): string => {
  if (path.isAbsolute(storedPath)) {
    return storedPath;
  }
  return path.join(process.cwd(), storedPath);
};
