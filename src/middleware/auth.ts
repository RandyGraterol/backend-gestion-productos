import { Response, NextFunction } from 'express';
import { AuthRequest, UserAttributes, UserRole } from '../types';
import { verifyToken } from '../utils/jwt';
import { User } from '../models';

/**
 * Authentication middleware
 * Extracts JWT from Authorization header, verifies it, and attaches user to request
 */
export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      res.status(401).json({
        success: false,
        error: 'No authorization token provided',
      });
      return;
    }

    // Check if header follows "Bearer <token>" format
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      res.status(401).json({
        success: false,
        error: 'Invalid authorization header format. Expected: Bearer <token>',
      });
      return;
    }

    const token = parts[1];

    // Verify token and extract payload
    const decoded = verifyToken(token);

    // Validar que el usuario aún exista y esté activo
    // (revoca acceso inmediato a cuentas eliminadas/desactivadas)
    const dbUser = await User.findByPk(decoded.id, {
      attributes: ['id', 'email', 'name', 'role', 'ownerId', 'phone', 'businessType', 'emailVerified', 'avatar', 'isActive', 'createdAt', 'updatedAt'],
    });

    if (!dbUser || !dbUser.isActive) {
      res.status(401).json({
        success: false,
        error: 'Account no longer exists or is deactivated',
      });
      return;
    }

    // Adjuntar datos FRESCOS de la BD (rol/owner actuales, no los del token)
    req.user = {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
      role: dbUser.role as UserRole,
      ownerId: dbUser.ownerId ?? null,
      phone: dbUser.phone ?? undefined,
      businessType: (dbUser.businessType ?? undefined) as UserAttributes['businessType'],
      emailVerified: dbUser.emailVerified,
      avatar: dbUser.avatar ?? undefined,
      isActive: dbUser.isActive,
      createdAt: dbUser.createdAt,
      updatedAt: dbUser.updatedAt,
    } as any;

    next();
  } catch (error) {
    if (error instanceof Error) {
      res.status(401).json({
        success: false,
        error: error.message,
      });
    } else {
      res.status(401).json({
        success: false,
        error: 'Authentication failed',
      });
    }
  }
};

/**
 * Authorization middleware factory
 * Creates middleware that checks if user has required role(s)
 * @param allowedRoles - Array of roles that are allowed to access the resource
 */
export const authorize = (...allowedRoles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    // Check if user is authenticated
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
      return;
    }

    // Check if user has required role
    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: 'Insufficient permissions to access this resource',
      });
      return;
    }

    next();
  };
};

/** Días de gracia del operador para verificar su correo */
export const OPERATOR_GRACE_DAYS = 15;

/**
 * Bloquea el acceso al inventario de un OPERADOR que no verificó su correo
 * después del plazo de gracia (15 días desde su creación).
 * Los demás roles pasan sin restricción.
 */
export const requireOperatorVerified = (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): void => {
  const user = req.user;

  if (!user) {
    _res.status(401).json({ success: false, error: 'Not authenticated' });
    return;
  }

  if (user.role === 'operator' && !user.emailVerified) {
    const deadlineMs =
      new Date(user.createdAt ?? Date.now()).getTime() +
      OPERATOR_GRACE_DAYS * 24 * 60 * 60 * 1000;

    if (Date.now() > deadlineMs) {
      _res.status(403).json({
        success: false,
        error: 'OPERATOR_EMAIL_UNVERIFIED',
        message:
          'Tu plazo de 15 días para verificar tu correo electrónico expiró. ' +
          'Verifica tu correo para recuperar el acceso al inventario.',
      });
      return;
    }
  }

  next();
};

/** Días del periodo de prueba gratuito */
export const TRIAL_DAYS = 30;

/**
 * Bloquea el acceso al panel de un CLIENTE cuyo periodo de prueba gratuito
 * (30 días desde trialStartDate o createdAt) expiró y no tiene un plan activo.
 * Solo aplica al rol 'client'. Admin y operator pasan sin restricción.
 */
export const requireTrialOrPlan = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  const user = req.user;

  if (!user || user.role !== 'client') {
    next();
    return;
  }

  // Obtener datos completos del usuario para trial y plan
  const dbUser = await User.findByPk(user.id, {
    attributes: ['plan', 'planStatus', 'trialStartDate', 'createdAt'],
  });

  if (!dbUser) {
    _res.status(401).json({ success: false, error: 'User not found' });
    return;
  }

  // Si tiene un plan activo → permitir acceso
  if (dbUser.plan && dbUser.planStatus === 'activo') {
    // Para planes que expiran (mensual/anual), verificar que no haya expirado
    if (dbUser.plan === 'lifetime') {
      next();
      return;
    }
    if (dbUser.planExpiry && new Date(dbUser.planExpiry).getTime() > Date.now()) {
      next();
      return;
    }
    // Plan expirado → tratar como sin plan
  }

  // Verificar periodo de prueba
  const trialStart = dbUser.trialStartDate ?? dbUser.createdAt;
  const deadlineMs = new Date(trialStart).getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000;

  if (Date.now() > deadlineMs) {
    const daysUsed = TRIAL_DAYS;
    _res.status(403).json({
      success: false,
      error: 'TRIAL_EXPIRED',
      message:
        `Tu periodo de prueba gratuito de ${TRIAL_DAYS} días ha expirado. ` +
        'Adquiere un plan para continuar usando la aplicación.',
      trialExpired: true,
      daysUsed,
    });
    return;
  }

  next();
};
