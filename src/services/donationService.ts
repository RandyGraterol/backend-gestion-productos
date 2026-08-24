import { Op } from 'sequelize';
import Donation, { DonationStatus } from '../models/Donation';
import DonationMethod from '../models/DonationMethod';
import DownloadLog from '../models/DownloadLog';
import AppVersion from '../models/AppVersion';
import { deleteUploadedFile } from '../config/multer';
import path from 'path';
import fs from 'fs';

// ==================== MÉTODOS DE PAGO ====================

export interface CreateMethodInput {
  type: string;
  title: string;
  details: string;
  extraInfo?: string;
  sortOrder?: number;
}

export const getActiveMethods = async (): Promise<DonationMethod[]> => {
  return DonationMethod.findAll({
    where: { isActive: true },
    order: [['sortOrder', 'ASC'], ['createdAt', 'ASC']],
  });
};

export const getAllMethods = async (): Promise<DonationMethod[]> => {
  return DonationMethod.findAll({
    order: [['sortOrder', 'ASC'], ['createdAt', 'ASC']],
  });
};

export const createMethod = async (input: CreateMethodInput): Promise<DonationMethod> => {
  return DonationMethod.create({
    type: input.type as any,
    title: input.title,
    details: input.details,
    extraInfo: input.extraInfo || null,
    sortOrder: input.sortOrder ?? 0,
    isActive: true,
  });
};

export const updateMethod = async (
  id: string,
  input: Partial<CreateMethodInput> & { isActive?: boolean }
): Promise<DonationMethod | null> => {
  const method = await DonationMethod.findByPk(id);
  if (!method) return null;

  await method.update({
    ...(input.type !== undefined ? { type: input.type as any } : {}),
    ...(input.title !== undefined ? { title: input.title } : {}),
    ...(input.details !== undefined ? { details: input.details } : {}),
    ...(input.extraInfo !== undefined ? { extraInfo: input.extraInfo || null } : {}),
    ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
    ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
  });

  return method;
};

export const deleteMethod = async (id: string): Promise<boolean> => {
  const rows = await DonationMethod.destroy({ where: { id } });
  return rows > 0;
};

// ==================== DONACIONES ====================

export interface CreateDonationInput {
  donorEmail: string;
  amount?: string | null;
  comment: string;
  screenshotPath: string;
  screenshotName?: string | null;
}

export const createDonation = async (input: CreateDonationInput): Promise<Donation> => {
  return Donation.create({
    donorEmail: input.donorEmail.trim().toLowerCase(),
    amount: input.amount?.trim() || null,
    comment: input.comment.trim(),
    screenshotPath: input.screenshotPath,
    screenshotName: input.screenshotName || null,
    status: 'pendiente',
  });
};

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  totalPages: number;
}

const paginate = <T extends object>(
  items: T[],
  total: number,
  page: number,
  limit: number
): PaginatedResult<T> => ({
  items,
  total,
  page,
  totalPages: Math.max(1, Math.ceil(total / limit)),
});

export const listDonations = async (
  page = 1,
  limit = 20,
  status?: DonationStatus
): Promise<PaginatedResult<Donation>> => {
  const where = status ? { status } : {};
  const { rows, count } = await Donation.findAndCountAll({
    where,
    order: [['createdAt', 'DESC']],
    offset: (page - 1) * limit,
    limit,
  });
  return paginate(rows, count, page, limit);
};

export const setDonationStatus = async (
  id: string,
  status: DonationStatus
): Promise<Donation | null> => {
  const donation = await Donation.findByPk(id);
  if (!donation) return null;

  await donation.update({
    status,
    reviewedAt: status === 'pendiente' ? null : new Date(),
  });

  return donation;
};

export const deleteDonation = async (id: string): Promise<boolean> => {
  const donation = await Donation.findByPk(id);
  if (!donation) return false;

  // Remove the screenshot file
  const absolutePath = resolveUploadPath(donation.screenshotPath);
  if (fs.existsSync(absolutePath)) {
    deleteUploadedFile(absolutePath);
  }

  await donation.destroy();
  return true;
};

export const getDonationStats = async () => {
  const [total, pending, reviewed] = await Promise.all([
    Donation.count(),
    Donation.count({ where: { status: 'pendiente' } }),
    Donation.count({ where: { status: 'revisada' } }),
  ]);
  return { total, pending, reviewed };
};

/**
 * Resolve a stored relative uploads path to an absolute filesystem path
 */
const resolveUploadPath = (storedPath: string): string => {
  if (path.isAbsolute(storedPath)) {
    return storedPath;
  }
  return path.join(process.cwd(), storedPath);
};

// ==================== REGISTRO DE DESCARGAS ====================

export interface LogDownloadInput {
  appVersionId: string;
  email: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export const logDownload = async (input: LogDownloadInput): Promise<void> => {
  try {
    await DownloadLog.create({
      appVersionId: input.appVersionId,
      email: input.email.trim().toLowerCase(),
      ipAddress: input.ipAddress || null,
      userAgent: input.userAgent?.slice(0, 500) || null,
    });
  } catch (error) {
    // Never block a download because logging failed
    console.error('⚠️ Failed to log download:', error);
  }
};

export const listDownloadLogs = async (
  page = 1,
  limit = 20
): Promise<PaginatedResult<DownloadLog>> => {
  const { rows, count } = await DownloadLog.findAndCountAll({
    include: [
      {
        model: AppVersion,
        as: 'version',
        attributes: ['version', 'releaseName'],
      },
    ],
    order: [['createdAt', 'DESC']],
    offset: (page - 1) * limit,
    limit,
  });
  return paginate(rows, count, page, limit);
};

export interface DownloadStats {
  total: number;
  uniqueUsers: number;
  last7Days: number;
}

export const getDownloadLogStats = async (): Promise<DownloadStats> => {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [total, uniqueUsers, last7Days] = await Promise.all([
    DownloadLog.count(),
    DownloadLog.count({
      distinct: true,
      col: 'email',
    }),
    DownloadLog.count({
      where: { createdAt: { [Op.gte]: sevenDaysAgo } },
    }),
  ]);

  return { total, uniqueUsers, last7Days };
};
