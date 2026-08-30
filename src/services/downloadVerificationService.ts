import crypto from 'crypto';
import { Op } from 'sequelize';
import DownloadVerification from '../models/DownloadVerification';
import { sendDownloadCodeEmail } from './emailService';
import { AppError } from '../types';

const CODE_LENGTH = 6;
const CODE_TTL_MINUTES = 30;
const TOKEN_TTL_MINUTES = 15;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_SECONDS = 60;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Generate a random numeric one-time code
 */
const generateCode = (): string => {
  // Cryptographically secure 6-digit code (000000 - 999999)
  return String(crypto.randomInt(0, 10 ** CODE_LENGTH)).padStart(CODE_LENGTH, '0');
};

/**
 * Hash the code for storage (codes are never stored in plain text)
 */
const hashCode = (code: string): string => {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.createHash('sha256').update(`${salt}:${code}`).digest('hex');
  return `${salt}:${hash}`;
};

/**
 * Constant-time comparison of a plain code against its stored hash
 */
const compareCode = (code: string, stored: string): boolean => {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const candidate = crypto.createHash('sha256').update(`${salt}:${code}`).digest('hex');
  const a = Buffer.from(hash, 'hex');
  const b = Buffer.from(candidate, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

export interface RequestCodeResult {
  email: string;
  expiresInMinutes: number;
}

/**
 * Step 1: user requests a one-time code for their email
 */
export const requestDownloadCode = async (email: string): Promise<RequestCodeResult> => {
  const normalizedEmail = email.trim().toLowerCase();

  if (!EMAIL_PATTERN.test(normalizedEmail)) {
    throw new AppError('Ingresa un correo electrónico válido', 400);
  }

  // Cooldown: evitar bombardear el mismo buzón
  const last = await DownloadVerification.findOne({
    where: { email: normalizedEmail },
    order: [['createdAt', 'DESC']],
  });

  if (last) {
    const secondsSinceLast = (Date.now() - new Date(last.createdAt).getTime()) / 1000;
    if (secondsSinceLast < RESEND_COOLDOWN_SECONDS) {
      throw new AppError(
        `Ya enviamos un código a este correo. Solicita uno nuevo en ${Math.ceil(
          RESEND_COOLDOWN_SECONDS - secondsSinceLast
        )} segundos.`,
        429
      );
    }
  }

  // Persistencia: si existe un código VIGENTE sin verificar, se reenvía EL MISMO
  const active = await DownloadVerification.findOne({
    where: {
      email: normalizedEmail,
      verified: false,
      expiresAt: { [Op.gt]: new Date() },
    },
    order: [['createdAt', 'DESC']],
  });

  let codeToSend: string;
  let record: DownloadVerification;

  if (active && active.code) {
    // Reenviar el mismo código (persistente durante su ventana de validez)
    codeToSend = active.code;
    record = active;
    console.log(`♻️ Reenviando código vigente a ${normalizedEmail}`);
  } else {
    codeToSend = generateCode();
    record = await DownloadVerification.create({
      email: normalizedEmail,
      code: codeToSend,
      codeHash: hashCode(codeToSend),
      expiresAt: new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000),
      attempts: 0,
      verified: false,
      tokenUsed: false,
    });
  }

  const result = await sendDownloadCodeEmail(normalizedEmail, codeToSend);

  if (!result.sent) {
    // Solo eliminar si el registro es nuevo (no reutilizado)
    if (!active || active.id !== record.id) {
      await record.destroy();
    }
    throw new AppError(result.message ?? 'No se pudo enviar el correo. Inténtalo de nuevo.', 502);
  }

  return { email: normalizedEmail, expiresInMinutes: CODE_TTL_MINUTES };
};

export interface VerifyCodeResult {
  token: string;
  expiresInMinutes: number;
}

/**
 * Step 2: user submits the code; on success issues a short-lived download token
 */
export const verifyDownloadCode = async (email: string, code: string): Promise<VerifyCodeResult> => {
  const normalizedEmail = email.trim().toLowerCase();

  const record = await DownloadVerification.findOne({
    where: {
      email: normalizedEmail,
      verified: false,
      expiresAt: { [Op.gt]: new Date() },
    },
    order: [['createdAt', 'DESC']],
  });

  if (!record) {
    throw new AppError('No hay un código vigente para este correo. Solicita uno nuevo.', 400);
  }

  if (record.attempts >= MAX_ATTEMPTS) {
    throw new AppError(
      'Demasiados intentos incorrectos. Solicita un nuevo código para continuar.',
      429
    );
  }

  const matchesPlain =
    !!record.code && code.trim().length === record.code.length &&
    crypto.timingSafeEqual(Buffer.from(code.trim()), Buffer.from(record.code));
  const matchesHash = !record.code ? compareCode(code.trim(), record.codeHash) : false;

  if (!matchesPlain && !matchesHash) {
    await record.increment('attempts');
    const remaining = MAX_ATTEMPTS - (record.attempts + 1);
    throw new AppError(
      remaining > 0
        ? `El código es incorrecto. Te quedan ${remaining} intento${remaining === 1 ? '' : 's'}.`
        : 'El código es incorrecto. Solicita un nuevo código para continuar.',
      400
    );
  }

  // Code is valid: mark verified and issue single-use download token
  const token = crypto.randomBytes(32).toString('hex');
  const tokenExpiresAt = new Date(Date.now() + TOKEN_TTL_MINUTES * 60 * 1000);

  record.verified = true;
  record.token = token;
  record.tokenExpiresAt = tokenExpiresAt;
  record.tokenUsed = false;
  await record.save();

  return { token, expiresInMinutes: TOKEN_TTL_MINUTES };
};

/**
 * Validate and consume a download token (single use)
 * Returns the verified email when valid
 */
export const consumeDownloadToken = async (token: string): Promise<{ email: string }> => {
  const record = await DownloadVerification.findOne({ where: { token } });

  if (
    !record ||
    !record.verified ||
    record.tokenUsed ||
    !record.tokenExpiresAt ||
    new Date(record.tokenExpiresAt).getTime() < Date.now()
  ) {
    throw new AppError(
      'Tu sesión de descarga no es válida o ya expiró. Confirma tu correo nuevamente.',
      403
    );
  }

  record.tokenUsed = true;
  await record.save();

  return { email: record.email };
};

/**
 * Check if an email already has a valid (verified, unused, non-expired) download token.
 * If so, return it so the frontend can skip the code verification step.
 */
export const checkDownloadEmail = async (
  email: string
): Promise<{ alreadyVerified: true; token: string; expiresInMinutes: number } | { alreadyVerified: false }> => {
  const normalizedEmail = email.trim().toLowerCase();

  const record = await DownloadVerification.findOne({
    where: {
      email: normalizedEmail,
      verified: true,
      tokenUsed: false,
      tokenExpiresAt: { [Op.gt]: new Date() },
    },
    order: [['createdAt', 'DESC']],
  });

  if (record && record.token && record.tokenExpiresAt) {
    const expiresInMs = new Date(record.tokenExpiresAt).getTime() - Date.now();
    const expiresInMinutes = Math.max(1, Math.ceil(expiresInMs / (60 * 1000)));
    return { alreadyVerified: true, token: record.token, expiresInMinutes };
  }

  return { alreadyVerified: false };
};
