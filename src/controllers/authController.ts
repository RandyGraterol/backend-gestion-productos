import { Request, Response, NextFunction } from 'express';
import * as authService from '../services/authService';
import { AuthRequest } from '../types';
import {
  generateToken,
  generateRefreshToken,
  verifyToken,
} from '../utils/jwt';
import { config } from '../config/env';
import { detectRegistrationIp } from '../services/ipDetectionService';

/**
 * Register a new client (web or app)
 * POST /api/auth/register
 *
 * - Si el correo ya estaba verificado (p. ej. al descargar la app):
 *   devuelve sesión completa.
 * - Si no: envía código OTP y responde needVerification.
 */
export const registerHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password, name, phone, businessType } = req.body;

    // Detect real IP and VPN status from the request
    const ipInfo = await detectRegistrationIp(req);

    const result = await authService.register({
      email,
      password,
      name,
      role: 'client',
      phone: phone ?? null,
      businessType: businessType ?? null,
      registrationIp: ipInfo.ip,
      registrationLocation: ipInfo.location,
      isVpn: ipInfo.isVpn,
    });

    if ('needVerification' in result && result.needVerification) {
      res.status(200).json({
        success: true,
        data: { needVerification: true, email: result.email },
        message:
          'Cuenta creada. Enviamos un código a tu correo para confirmarla. Revisa tu bandeja o spam.',
      });
      return;
    }

    if ('user' in result) {
      res.status(201).json({
        success: true,
        data: {
          user: result.user,
          token: result.token,
          refreshToken: result.refreshToken,
          needVerification: false,
        },
        message: 'Registro exitoso. Tu correo ya estaba verificado.',
      });
      return;
    }

    next(new Error('Respuesta de registro inválida'));
  } catch (error) {
    next(error);
  }
};

/**
 * Verificar código de registro
 * POST /api/auth/verify-registration
 */
export const verifyRegistrationHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, code } = req.body;
    const result = await authService.verifyRegistration(email, code);

    res.status(200).json({
      success: true,
      data: {
        user: result.user,
        token: result.token,
        refreshToken: result.refreshToken,
        needVerification: false,
      },
      message: 'Correo verificado correctamente. ¡Bienvenido!',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Reenviar código de verificación de registro
 * POST /api/auth/resend-registration-code
 */
export const resendRegistrationCodeHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email } = req.body;
    const result = await authService.resendRegistrationCode(email);
    res.status(200).json({ success: true, data: result, message: result.message });
  } catch (error) {
    next(error);
  }
};

/**
 * Enviar código de verificación al usuario autenticado (operadores)
 * POST /api/auth/send-verification
 */
export const sendVerificationHandler = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }
    const result = await authService.sendVerificationToUser(req.user.id);
    res.status(200).json({ success: true, data: result, message: result.message });
  } catch (error) {
    next(error);
  }
};

/**
 * Login user with email and password
 * POST /api/auth/login
 */
export const loginHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password } = req.body;

    const result = await authService.login(email, password);

    if ('needVerification' in result && result.needVerification) {
      res.status(200).json({
        success: true,
        data: { needVerification: true, email: result.email },
        message:
          'Tu correo aún no está verificado. Te enviamos un código para confirmarlo.',
      });
      return;
    }

    if ('user' in result) {
      res.status(200).json({
        success: true,
        data: {
          user: result.user,
          token: result.token,
          refreshToken: result.refreshToken,
          ...(result.emailUnverified ? { emailUnverified: true } : {}),
          ...(result.accessBlocked ? { accessBlocked: true } : {}),
          ...(result.graceDaysLeft !== undefined
            ? { graceDaysLeft: result.graceDaysLeft }
            : {}),
        },
        message: 'Login successful',
      });
      return;
    }

    next(new Error('Respuesta de login inválida'));
  } catch (error) {
    next(error);
  }
};

/**
 * Refresh access token using refresh token
 * POST /api/auth/refresh
 */
export const refreshHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    const result = await authService.refreshTokens(refreshToken);

    res.status(200).json({
      success: true,
      data: {
        token: result.token,
        refreshToken: result.refreshToken,
        ...(result.emailUnverified ? { emailUnverified: true } : {}),
        ...(result.accessBlocked ? { accessBlocked: true } : {}),
        ...(result.graceDaysLeft !== undefined
          ? { graceDaysLeft: result.graceDaysLeft }
          : {}),
      },
      message: 'Token refreshed successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current user by JWT
 * GET /api/auth/me
 */
export const getCurrentUserHandler = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Not authenticated',
      });
      return;
    }

    const user = await authService.getCurrentUser(req.user.id);

    res.status(200).json({
      success: true,
      data: user,
      message: 'Current user retrieved successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Forgot password
 * POST /api/auth/forgot-password
 */
export const forgotPasswordHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email } = req.body;
    const result = await authService.forgotPassword(email);
    res.status(200).json({ success: true, data: result, message: result.message });
  } catch (error) {
    next(error);
  }
};

/**
 * Reset password with OTP code
 * POST /api/auth/reset-password
 */
export const resetPasswordHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, code, password } = req.body;
    const result = await authService.resetPassword(email, code, password);
    res.status(200).json({ success: true, data: result, message: result.message });
  } catch (error) {
    next(error);
  }
};

// Referencias mantenidas para compatibilidad con usos previos del módulo
export const _internal = {
  generateToken,
  generateRefreshToken,
  verifyToken,
  config,
};
