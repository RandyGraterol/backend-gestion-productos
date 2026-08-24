import { Request, Response, NextFunction } from 'express';
import * as donationService from '../services/donationService';
import { DonationStatus } from '../models/Donation';

// ==================== PÚBLICOS ====================

/**
 * Public: list active payment methods
 */
export const listActiveMethodsHandler = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const methods = await donationService.getActiveMethods();
    res.status(200).json({
      success: true,
      data: methods,
      message: 'Payment methods retrieved successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Public: submit a donation receipt (screenshot + email + comment)
 */
export const createDonationHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({
        success: false,
        error: 'Debes adjuntar la captura de pantalla del pago',
      });
      return;
    }

    const { donorEmail, amount, comment } = req.body;
    // Store path relative to cwd (uploads/donations/<file>)
    const relativePath = req.file.path.replace(/^.*(uploads[/\\]donations[/\\])/, 'uploads/donations/');

    const donation = await donationService.createDonation({
      donorEmail,
      amount,
      comment,
      screenshotPath: relativePath,
      screenshotName: req.file.originalname,
    });

    res.status(201).json({
      success: true,
      data: { id: donation.id },
      message: '¡Gracias por tu aporte! El desarrollador revisará tu comprobante.',
    });
  } catch (error) {
    next(error);
  }
};

// ==================== MÉTODOS DE PAGO (ADMIN) ====================

export const listAllMethodsHandler = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const methods = await donationService.getAllMethods();
    res.status(200).json({ success: true, data: methods });
  } catch (error) {
    next(error);
  }
};

export const createMethodHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const method = await donationService.createMethod(req.body);
    res.status(201).json({
      success: true,
      data: method,
      message: 'Método de pago creado correctamente',
    });
  } catch (error) {
    next(error);
  }
};

export const updateMethodHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const method = await donationService.updateMethod(req.params.id, req.body);
    if (!method) {
      res.status(404).json({ success: false, error: 'Método de pago no encontrado' });
      return;
    }
    res.status(200).json({
      success: true,
      data: method,
      message: 'Método de pago actualizado correctamente',
    });
  } catch (error) {
    next(error);
  }
};

export const deleteMethodHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const deleted = await donationService.deleteMethod(req.params.id);
    if (!deleted) {
      res.status(404).json({ success: false, error: 'Método de pago no encontrado' });
      return;
    }
    res.status(200).json({ success: true, message: 'Método de pago eliminado' });
  } catch (error) {
    next(error);
  }
};

// ==================== DONACIONES (ADMIN) ====================

export const listDonationsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const status = req.query.status as DonationStatus | undefined;

    const result = await donationService.listDonations(page, limit, status);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const setDonationStatusHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { status } = req.body as { status: DonationStatus };
    const donation = await donationService.setDonationStatus(req.params.id, status);
    if (!donation) {
      res.status(404).json({ success: false, error: 'Donación no encontrada' });
      return;
    }
    res.status(200).json({
      success: true,
      data: donation,
      message: `Donación marcada como ${status}`,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteDonationHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const deleted = await donationService.deleteDonation(req.params.id);
    if (!deleted) {
      res.status(404).json({ success: false, error: 'Donación no encontrada' });
      return;
    }
    res.status(200).json({ success: true, message: 'Donación eliminada' });
  } catch (error) {
    next(error);
  }
};

export const donationStatsHandler = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const stats = await donationService.getDonationStats();
    res.status(200).json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
};

// ==================== LOG DE DESCARGAS (ADMIN) ====================

export const downloadLogsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));

    const result = await donationService.listDownloadLogs(page, limit);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const downloadLogStatsHandler = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const stats = await donationService.getDownloadLogStats();
    res.status(200).json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
};
