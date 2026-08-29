import { Request, Response, NextFunction } from 'express';
import * as appVersionService from '../services/appVersionService';
import * as downloadVerificationService from '../services/downloadVerificationService';
import * as donationService from '../services/donationService';
import { User } from '../models';
import { verifyToken } from '../utils/jwt';
import { AuthRequest } from '../types';
import { detectRegistrationIp } from '../services/ipDetectionService';

/**
 * Public: request a one-time code to confirm email before downloading
 */
export const requestDownloadCodeHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email } = req.body;
    const result = await downloadVerificationService.requestDownloadCode(email);
    res.status(200).json({
      success: true,
      data: result,
      message: `Código enviado a ${result.email}. Revisa tu bandeja de entrada o spam.`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Public: verify the code and obtain a single-use download token
 */
export const verifyDownloadCodeHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, code } = req.body;
    const result = await downloadVerificationService.verifyDownloadCode(email, code);
    res.status(200).json({
      success: true,
      data: result,
      message: 'Correo confirmado. Tu descarga comenzará en unos segundos.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Public: list all active app versions
 */
export const listVersionsHandler = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const versions = await appVersionService.getAllVersions();
    res.status(200).json({
      success: true,
      data: versions,
      message: 'App versions retrieved successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Public: get latest active version
 */
export const latestVersionHandler = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const version = await appVersionService.getLatestVersion();
    res.status(200).json({
      success: true,
      data: version,
      message: 'Latest app version retrieved successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: upload a new app version
 */
export const uploadVersionHandler = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({
        success: false,
        error: 'No se proporcionó ningún archivo (.apk o .aab)',
      });
      return;
    }

    const { version, releaseName, releaseNotes } = req.body;

    // Store path relative to project cwd so it works across environments
    const relativePath = req.file.path.replace(/^.*(uploads[/\\]apk[/\\])/, 'uploads/apk/');

    const created = await appVersionService.createVersion({
      version,
      releaseName,
      releaseNotes,
      fileName: req.file.originalname,
      filePath: relativePath,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      uploadedBy: req.user?.id,
    });

    res.status(201).json({
      success: true,
      data: created,
      message: `Versión ${created.version} publicada correctamente`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Public: download an app version.
 * Requires either a verified single-use token (landing flow) or an admin JWT
 * in the Authorization header (admin panel). Counter increments only for
 * verified public downloads.
 */
export const downloadVersionHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    // Admin bypass: valid admin JWT allows direct download without consuming tokens.
    // Cualquier usuario autenticado con correo verificado también descarga directo.
    const authHeader = req.headers.authorization;
    let isAdminDownload = false;
    let verifiedUserEmail: string | null = null;

    if (authHeader?.startsWith('Bearer ')) {
      try {
        const decoded = verifyToken(authHeader.slice(7));
        const user = await User.findByPk(decoded.id, {
          attributes: ['id', 'email', 'role', 'emailVerified', 'isActive'],
        });

        if (user?.isActive) {
          if (user.role === 'admin') {
            isAdminDownload = true;
          } else if (user.emailVerified) {
            verifiedUserEmail = user.email;
          }
        }
      } catch {
        // Token inválido cae a la validación de token de un solo uso
      }
    }

    // Detect IP and VPN status for download logging
    const ipInfo = await detectRegistrationIp(req);

    if (!isAdminDownload && !verifiedUserEmail) {
      const token = typeof req.query.token === 'string' ? req.query.token : '';
      // Consume the one-time token issued after email verification
      const verification = await downloadVerificationService.consumeDownloadToken(token);

      // Record who downloaded the app (public downloads only)
      await donationService.logDownload({
        appVersionId: id,
        email: verification.email,
        ipAddress: ipInfo.ip,
        userAgent: req.headers['user-agent'] ?? null,
        location: ipInfo.location,
        isVpn: ipInfo.isVpn,
      });
    } else if (verifiedUserEmail) {
      // Usuario autenticado con correo verificado: cuenta y registra igual
      await donationService.logDownload({
        appVersionId: id,
        email: verifiedUserEmail,
        ipAddress: ipInfo.ip,
        userAgent: req.headers['user-agent'] ?? null,
        location: ipInfo.location,
        isVpn: ipInfo.isVpn,
      });
    }

    const appVersion = isAdminDownload
      ? await appVersionService.getVersionById(id)
      : await appVersionService.incrementDownloadCount(id);

    if (!appVersion) {
      res.status(404).json({
        success: false,
        error: 'Versión no encontrada',
      });
      return;
    }

    const absolutePath = appVersionService.resolveFilePath(appVersion.filePath);
    const downloadName = `inventario-app-v${appVersion.version}.apk`;

    res.download(absolutePath, downloadName, (err) => {
      if (err && !res.headersSent) {
        next(err);
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: delete an app version
 */
export const deleteVersionHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const deleted = await appVersionService.deleteVersion(id);

    if (!deleted) {
      res.status(404).json({
        success: false,
        error: 'Versión no encontrada',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Versión eliminada correctamente',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: aggregate download statistics
 */
export const statsHandler = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const stats = await appVersionService.getVersionStats();
    res.status(200).json({
      success: true,
      data: stats,
      message: 'Stats retrieved successfully',
    });
  } catch (error) {
    next(error);
  }
};
