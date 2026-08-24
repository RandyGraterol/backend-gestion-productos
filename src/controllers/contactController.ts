import { Request, Response, NextFunction } from 'express';
import * as contactService from '../services/contactService';

/**
 * Public: submit a contact message to the developer
 */
export const createContactMessageHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, email, message } = req.body;
    const created = await contactService.createContactMessage({ name, email, message });
    res.status(201).json({
      success: true,
      data: { id: created.id },
      message: 'Mensaje enviado correctamente. El desarrollador te contactará pronto.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: list contact messages (unread first)
 */
export const listContactMessagesHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const result = await contactService.listContactMessages(page, limit);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: mark message as read/unread
 */
export const markMessageHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const isRead = req.body.isRead === true;
    const message = await contactService.markMessageAsRead(req.params.id, isRead);
    if (!message) {
      res.status(404).json({ success: false, error: 'Mensaje no encontrado' });
      return;
    }
    res.status(200).json({
      success: true,
      data: message,
      message: isRead ? 'Mensaje marcado como leído' : 'Mensaje marcado como no leído',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: delete a contact message
 */
export const deleteContactMessageHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const deleted = await contactService.deleteContactMessage(req.params.id);
    if (!deleted) {
      res.status(404).json({ success: false, error: 'Mensaje no encontrado' });
      return;
    }
    res.status(200).json({ success: true, message: 'Mensaje eliminado' });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: contact message stats
 */
export const contactStatsHandler = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const stats = await contactService.getContactStats();
    res.status(200).json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
};
