import { User } from '../models';
import { UserCreationAttributes, UserResponse, AppError } from '../types';
import {
  generateToken,
  generateRefreshToken,
} from '../utils/jwt';
import {
  requestDownloadCode,
  verifyDownloadCode,
} from '../services/downloadVerificationService';
import { seedDefaultCategories } from './categoryService';

/** Días de gracia para que un operador verifique su correo */
export const OPERATOR_GRACE_DAYS = 15;

/**
 * Construye la respuesta pública del usuario.
 * Para operadores incluye ownerName (nombre del cliente dueño del inventario).
 */
const buildUserResponse = async (user: User): Promise<UserResponse> => {
  const response: UserResponse = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    ownerId: user.ownerId ?? null,
    phone: user.phone ?? null,
    businessType: user.businessType ?? null,
    emailVerified: user.emailVerified,
    avatar: user.avatar,
    isActive: user.isActive,
    plan: user.plan,
    planStatus: user.planStatus,
    planExpiry: user.planExpiry,
    trialStartDate: user.trialStartDate,
    customExchangeRate: user.customExchangeRate ?? null,
    exchangeRateMode: user.exchangeRateMode ?? 'auto',
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  } as any;

  if (user.role === 'operator' && user.ownerId) {
    const owner = await User.findByPk(user.ownerId, { attributes: ['name'] });
    response.ownerName = owner?.name ?? null;
  }

  return response;
};

/**
 * Indica si el usuario ya confirmó su correo en algún momento:
 * - su cuenta está marcada verificada, O
 * - existe una verificación de descarga confirmada para su correo
 *   (cruce: verificar para descargar = verificar para registrarse y viceversa)
 */
const isEmailAlreadyVerified = async (
  email: string,
  userId?: string
): Promise<boolean> => {
  if (userId) {
    const user = await User.findByPk(userId, { attributes: ['emailVerified'] });
    if (user?.emailVerified) return true;
  }

  const downloadVerification = await User.findOne({
    where: { email: email.trim().toLowerCase(), emailVerified: true },
  });

  // También aceptar verificaciones hechas por el flujo de descarga
  if (downloadVerification) return true;

  const { DownloadVerification } = require('../models');
  const dv = await DownloadVerification.findOne({
    where: { email: email.trim().toLowerCase(), verified: true },
  });
  return !!dv;
};

/**
 * Register a new client (web or app).
 * - Si el correo ya fue verificado previamente (p. ej. al descargar la app),
 *   la cuenta nace verificada y se devuelven los tokens.
 * - Si no, la cuenta nace sin verificar y se envía un código de un solo uso.
 */
export const register = async (
  userData: UserCreationAttributes & { phone?: string; businessType?: string; registrationIp?: string | null; registrationLocation?: string | null; isVpn?: boolean }
): Promise<
  | { needVerification: true; email: string }
  | { user: UserResponse; token: string; refreshToken: string }
> => {
  try {
    // Todo autoregistro crea un cliente. El rol del request se ignora.
    const user = await User.create({
      ...userData,
      role: 'client',
      emailVerified: false,
      trialStartDate: new Date(), // Iniciar periodo de prueba de 30 días
      registrationIp: userData.registrationIp ?? null,
      registrationLocation: userData.registrationLocation ?? null,
      isVpn: userData.isVpn ?? false,
    } as any);

    // Seed default categories for the new user
    await seedDefaultCategories(user.id);

    // Cruce: ¿este correo ya verificó antes (descarga u otro registro)?
    const alreadyVerified = await isEmailAlreadyVerified(user.email, user.id);

    if (alreadyVerified) {
      await user.update({ emailVerified: true });

      const userResponse = await buildUserResponse(user);
      const token = generateToken(userResponse);
      const refreshToken = generateRefreshToken(userResponse);

      return { user: userResponse, token, refreshToken };
    }

    // Enviar código de verificación (reutiliza la infraestructura de descargas)
    await requestDownloadCode(user.email);

    return { needVerification: true, email: user.email };
  } catch (error: any) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      throw new AppError('Email already exists', 409);
    }
    throw error;
  }
};

/**
 * Verifica el código de registro y activa la cuenta.
 * Devuelve los tokens (auto-login tras verificar).
 */
export const verifyRegistration = async (
  email: string,
  code: string
): Promise<{ user: UserResponse; token: string; refreshToken: string }> => {
  const normalizedEmail = email.trim().toLowerCase();

  const user = await User.findOne({ where: { email: normalizedEmail } });
  if (!user) {
    throw new AppError('Cuenta no encontrada', 404);
  }

  if (user.emailVerified) {
    // Ya verificado: entregar sesión directamente
    const userResponse = await buildUserResponse(user);
    return {
      user: userResponse,
      token: generateToken(userResponse),
      refreshToken: generateRefreshToken(userResponse),
    };
  }

  // Valida el código contra las verificaciones existentes (expira en 10 min,
  // máx. intentos, etc.) — mismo mecanismo que la descarga
  await verifyDownloadCode(normalizedEmail, code);

  user.emailVerified = true;
  await user.save();

  const userResponse = await buildUserResponse(user);
  const token = generateToken(userResponse);
  const refreshToken = generateRefreshToken(userResponse);

  return { user: userResponse, token, refreshToken };
};

/**
 * Reenvía el código de verificación de registro
 */
export const resendRegistrationCode = async (email: string): Promise<{ message: string }> => {
  const result = await requestDownloadCode(email);
  return { message: `Código enviado a ${result.email}` };
};

/**
 * Envía código de verificación para un usuario autenticado (operadores)
 */
export const sendVerificationToUser = async (userId: string): Promise<{ message: string }> => {
  const user = await User.findByPk(userId);
  if (!user) throw new AppError('Usuario no encontrado', 404);
  if (user.emailVerified) throw new AppError('Tu correo ya está verificado', 400);

  await requestDownloadCode(user.email);
  return { message: `Código enviado a ${user.email}` };
};

/**
 * Login user with email and password.
 * - client sin verificar: responde needVerification y envía código
 * - operator sin verificar: entra normal con aviso (gracia de 15 días)
 */
export const login = async (
  email: string,
  password: string
): Promise<
  | { needVerification: true; email: string }
  | {
      user: UserResponse;
      token: string;
      refreshToken: string;
      emailUnverified?: boolean;
      accessBlocked?: boolean;
      graceDaysLeft?: number;
    }
> => {
  const user = await User.findOne({ where: { email: email?.trim().toLowerCase() } });

  if (!user) {
    throw new AppError('Invalid email or password', 401);
  }

  if (!user.isActive) {
    throw new AppError('Account is deactivated', 401);
  }

  // Operador fuera del plazo de gracia puede autenticarse solo para
  // acceder a la verificación; el inventario le será bloqueado por middleware.
  const passwordValid = await user.comparePassword(password);

  if (!passwordValid) {
    throw new AppError('Invalid email or password', 401);
  }

  // Cliente sin verificar: guiarlo a la verificación
  if (user.role === 'client' && !user.emailVerified) {
    try {
      await requestDownloadCode(user.email);
    } catch {
      // cooldown activo: el código reciente sigue vigente
    }
    return { needVerification: true, email: user.email };
  }

  const userResponse = await buildUserResponse(user);

  let emailUnverified = false;
  let accessBlocked = false;
  let graceDaysLeft: number | undefined;

  if (user.role === 'operator' && !user.emailVerified) {
    emailUnverified = true;
    const deadlineMs =
      new Date(user.createdAt).getTime() + OPERATOR_GRACE_DAYS * 24 * 60 * 60 * 1000;
    const daysLeft = Math.ceil((deadlineMs - Date.now()) / (24 * 60 * 60 * 1000));
    graceDaysLeft = Math.max(0, daysLeft);
    accessBlocked = Date.now() > deadlineMs;
  }

  const token = generateToken(userResponse);
  const refreshToken = generateRefreshToken(userResponse);

  return { user: userResponse, token, refreshToken, emailUnverified, accessBlocked, graceDaysLeft };
};

/**
 * Forgot password - Send OTP code via email
 * Reuses the same download verification infrastructure.
 */
export const forgotPassword = async (email: string): Promise<{ message: string }> => {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await User.findOne({ where: { email: normalizedEmail } });

  // Always return success message (security - don't reveal if email exists)
  if (!user) {
    return { message: 'Si el correo existe, enviamos un código de verificación.' };
  }

  // Send OTP code (reuses download verification infrastructure)
  await requestDownloadCode(normalizedEmail);

  return { message: 'Si el correo existe, enviamos un código de verificación.' };
};

/**
 * Reset password with OTP code
 * Verifies the code and sets the new password.
 */
export const resetPassword = async (
  email: string,
  code: string,
  newPassword: string
): Promise<{ message: string }> => {
  const normalizedEmail = email.trim().toLowerCase();

  // Verify the OTP code (reuses download verification infrastructure)
  await verifyDownloadCode(normalizedEmail, code);

  // Find user and update password
  const user = await User.findOne({ where: { email: normalizedEmail } });
  if (!user) {
    throw new AppError('Usuario no encontrado', 404);
  }

  user.set('password', newPassword);
  await user.save();

  return { message: 'Contraseña actualizada correctamente.' };
};

/**
 * Refresh access token using refresh token
 */
export const refreshTokens = async (
  refreshToken: string
): Promise<{
  token: string;
  refreshToken: string;
  emailUnverified?: boolean;
  accessBlocked?: boolean;
  graceDaysLeft?: number;
}> => {
  try {
    const { verifyToken } = require('../utils/jwt');
    const decoded = verifyToken(refreshToken);

    const user = await User.findByPk(decoded.id);

    if (!user) {
      throw new AppError('User not found', 401);
    }

    if (!user.isActive) {
      throw new AppError('Account is deactivated', 401);
    }

    const userResponse = await buildUserResponse(user);

    let emailUnverified = false;
    let accessBlocked = false;
    let graceDaysLeft: number | undefined;

    if (user.role === 'operator' && !user.emailVerified) {
      emailUnverified = true;
      const deadlineMs =
        new Date(user.createdAt).getTime() + OPERATOR_GRACE_DAYS * 24 * 60 * 60 * 1000;
      graceDaysLeft = Math.max(
        0,
        Math.ceil((deadlineMs - Date.now()) / (24 * 60 * 60 * 1000))
      );
      accessBlocked = Date.now() > deadlineMs;
    }

    const token = generateToken(userResponse);
    const newRefreshToken = generateRefreshToken(userResponse);

    return {
      token,
      refreshToken: newRefreshToken,
      ...(user.role === 'operator' && !user.emailVerified
        ? { emailUnverified, accessBlocked, graceDaysLeft }
        : {}),
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Invalid or expired refresh token', 401);
  }
};

/**
 * Get current user by ID
 */
export const getCurrentUser = async (userId: string): Promise<UserResponse> => {
  const user = await User.findByPk(userId);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  return buildUserResponse(user);
};
