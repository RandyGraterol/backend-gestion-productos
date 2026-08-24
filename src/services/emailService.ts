/**
 * Email Service
 * Sends emails using nodemailer (configurable via env vars)
 */

import nodemailer from 'nodemailer';
import path from 'path';
import fs from 'fs';
import { config } from '../config/env';

// Email transporter (lazy initialization)
let transporter: nodemailer.Transporter | null = null;

/**
 * Resolve the path to an asset file, checking both src/assets (dev) and dist/assets (production)
 * @param filename - The asset filename
 * @returns The resolved path to the asset
 */
const resolveAssetPath = (filename: string): string => {
  const devPath = path.resolve(process.cwd(), 'src', 'assets', filename);
  const prodPath = path.resolve(process.cwd(), 'dist', 'assets', filename);

  // Check dev path first (source exists)
  if (fs.existsSync(devPath)) {
    return devPath;
  }

  // Fall back to dist path (production Docker build)
  if (fs.existsSync(prodPath)) {
    return prodPath;
  }

  // Return dev path as default (will throw if file doesn't exist)
  console.warn(`⚠️  Asset not found: ${filename}. Checked: ${devPath}, ${prodPath}`);
  return devPath;
};

/**
 * Initialize email transporter
 */
const getTransporter = (): nodemailer.Transporter => {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: config.email.host,
    port: config.email.port,
    secure: config.email.secure,
    auth: {
      user: config.email.user,
      pass: config.email.password,
    },
  });

  return transporter;
};

/**
 * Send password reset email
 */
export const sendPasswordResetEmail = async (
  to: string,
  resetToken: string,
  userName: string
): Promise<boolean> => {
  if (!config.email.enabled) {
    console.log('📧 Email disabled. Reset token:', resetToken);
    return true; // Return true in dev mode
  }

  try {
    const transport = getTransporter();
    
    const resetUrl = `https://administracionurbantaxis.com/reset-password?token=${resetToken}`;
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc;">
        <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <!-- Header -->
          <div style="text-align: center; margin-bottom: 32px;">
            <div style="display: inline-block; width: 64px; height: 64px; background: linear-gradient(135deg, #059669, #065f46); border-radius: 16px; line-height: 64px; font-size: 32px;">
              📦
            </div>
            <h1 style="color: #0f172a; font-size: 24px; margin-top: 16px; margin-bottom: 8px;">
              InventarioApp
            </h1>
          </div>

          <!-- Card -->
          <div style="background: #ffffff; border-radius: 16px; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <h2 style="color: #0f172a; font-size: 20px; margin-bottom: 16px;">
              Restablecer Contraseña
            </h2>
            
            <p style="color: #64748b; font-size: 16px; line-height: 24px; margin-bottom: 16px;">
              Hola ${userName},
            </p>
            
            <p style="color: #64748b; font-size: 16px; line-height: 24px; margin-bottom: 24px;">
              Recibimos una solicitud para restablecer la contraseña de tu cuenta. Haz clic en el botón de abajo para crear una nueva contraseña:
            </p>

            <!-- Button -->
            <div style="text-align: center; margin-bottom: 24px;">
              <a href="${resetUrl}" style="display: inline-block; background: #059669; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-weight: 700; font-size: 16px;">
                Restablecer Contraseña
              </a>
            </div>

            <p style="color: #94a3b8; font-size: 14px; line-height: 20px; text-align: center; margin-bottom: 8px;">
              Este enlace expira en 1 hora.
            </p>

            <p style="color: #94a3b8; font-size: 14px; line-height: 20px; text-align: center;">
              Si no solicitaste este cambio, puedes ignorar este correo de forma segura.
            </p>
          </div>

          <!-- Footer -->
          <div style="text-align: center; margin-top: 32px;">
            <p style="color: #94a3b8; font-size: 12px; line-height: 16px;">
              © 2026 InventarioApp. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    await transport.sendMail({
      from: config.email.from,
      to,
      subject: 'Restablecer tu contraseña - InventarioApp',
      html: htmlContent,
    });

    console.log(`📧 Password reset email sent to ${to}`);
    return true;
  } catch (error) {
    console.error('❌ Failed to send email:', error);
    return false;
  }
};

/**
 * Send download verification code email
 * Returns an object indicating success and whether the error was a rejection (invalid mailbox)
 */
export const sendDownloadCodeEmail = async (
  to: string,
  code: string
): Promise<{ sent: boolean; rejected?: boolean; message?: string }> => {
  if (!config.email.enabled) {
    console.log('📧 Email disabled. Download code for', to, ':', code);
    return { sent: true };
  }

  try {
    const transport = getTransporter();

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f0f6ff;">
        <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <!-- Header -->
          <div style="text-align: center; margin-bottom: 28px;">
            <img src="cid:logo-santiago" alt="Logo" width="96" height="96" style="border-radius: 20px;" />
            <h1 style="color: #0f172a; font-size: 24px; margin-top: 14px; margin-bottom: 8px;">
              Software Inventario
            </h1>
          </div>

          <!-- Card -->
          <div style="background: #ffffff; border-radius: 16px; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <h2 style="color: #0f172a; font-size: 20px; margin-bottom: 16px;">
              Confirma tu correo electrónico
            </h2>

            <p style="color: #64748b; font-size: 16px; line-height: 24px; margin-bottom: 24px;">
              Usa el siguiente código de un solo uso para confirmar tu correo electrónico:
            </p>

            <!-- Code -->
            <div style="text-align: center; margin-bottom: 24px;">
              <div style="display: inline-block; background: #eff6ff; border: 2px dashed #2563eb; border-radius: 12px; padding: 18px 36px;">
                <span style="font-size: 36px; font-weight: 800; letter-spacing: 10px; color: #2563eb;">${code}</span>
              </div>
            </div>

            <p style="color: #94a3b8; font-size: 14px; line-height: 20px; text-align: center; margin-bottom: 8px;">
              Este código expira en 30 minutos y solo puede usarse una vez.
            </p>

            <!-- Spam notice -->
            <div style="background: #fffbeb; border: 1px solid #fcd34d; border-radius: 12px; padding: 14px 18px; margin-top: 20px;">
              <p style="color: #92400e; font-size: 14px; line-height: 21px; margin: 0;">
                💡 Si no encuentras este correo en tu bandeja principal, revisa la carpeta de <strong>spam</strong> o <strong>correo no deseado</strong>.
              </p>
            </div>

            <p style="color: #94a3b8; font-size: 14px; line-height: 20px; text-align: center; margin-top: 20px;">
              Si no solicitaste este código, puedes ignorar este correo de forma segura.
            </p>
          </div>

          <!-- Footer -->
          <div style="text-align: center; margin-top: 32px;">
            <p style="color: #94a3b8; font-size: 12px; line-height: 16px;">
              © ${new Date().getFullYear()} Software Inventario. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    const info = await transport.sendMail({
      from: config.email.from,
      to,
      subject: `Código de verificación: ${code} - Software Inventario`,
      html: htmlContent,
      attachments: [
        {
          filename: 'logo-santiago.png',
          path: resolveAssetPath('logo-santiago.png'),
          cid: 'logo-santiago',
        },
      ],
    });

    // Detect SMTP rejections (invalid mailbox, blocked recipient...)
    const rejected = Array.isArray(info.rejected) ? info.rejected.length > 0 : false;

    if (rejected) {
      console.warn(`⚠️ Download code email rejected for ${to}`);
      return {
        sent: false,
        rejected: true,
        message: 'El servidor de correo rechazó esta dirección. Verifica que el correo esté escrito correctamente.',
      };
    }

    console.log(`📧 Download code email sent to ${to}`);
    return { sent: true };
  } catch (error) {
    console.error('❌ Failed to send download code email:', error);

    const smtpError = error as { code?: string; responseCode?: number; response?: string };
    const isRejection =
      smtpError.code === 'EENVELOPE' ||
      smtpError.code === 'EDNS' ||
      (typeof smtpError.responseCode === 'number' && smtpError.responseCode >= 500);

    if (isRejection) {
      return {
        sent: false,
        rejected: true,
        message:
          'No pudimos entregar el correo a esta dirección. Verifica que esté escrita correctamente e inténtalo de nuevo.',
      };
    }

    return {
      sent: false,
      message: 'No se pudo enviar el correo en este momento. Inténtalo de nuevo en unos minutos.',
    };
  }
};

/**
 * Send welcome email
 */
export const sendWelcomeEmail = async (
  to: string,
  userName: string
): Promise<boolean> => {
  if (!config.email.enabled) {
    console.log('📧 Email disabled. Skipping welcome email to:', to);
    return true;
  }

  try {
    const transport = getTransporter();
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc;">
        <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <div style="text-align: center; margin-bottom: 32px;">
            <div style="display: inline-block; width: 64px; height: 64px; background: linear-gradient(135deg, #059669, #065f46); border-radius: 16px; line-height: 64px; font-size: 32px;">
              📦
            </div>
            <h1 style="color: #0f172a; font-size: 24px; margin-top: 16px;">
              ¡Bienvenido a InventarioApp!
            </h1>
          </div>

          <div style="background: #ffffff; border-radius: 16px; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <p style="color: #64748b; font-size: 16px; line-height: 24px; margin-bottom: 16px;">
              Hola ${userName},
            </p>
            
            <p style="color: #64748b; font-size: 16px; line-height: 24px; margin-bottom: 24px;">
              Tu cuenta ha sido creada correctamente. Ya puedes comenzar a gestionar tu inventario de forma inteligente.
            </p>

            <div style="background: #f0fdf4; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
              <p style="color: #059669; font-size: 14px; font-weight: 600; margin: 0;">
                ✅ Tu cuenta está lista para usar
              </p>
            </div>
          </div>

          <div style="text-align: center; margin-top: 32px;">
            <p style="color: #94a3b8; font-size: 12px;">
              © 2026 InventarioApp. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    await transport.sendMail({
      from: config.email.from,
      to,
      subject: '¡Bienvenido a InventarioApp!',
      html: htmlContent,
    });

    console.log(`📧 Welcome email sent to ${to}`);
    return true;
  } catch (error) {
    console.error('❌ Failed to send welcome email:', error);
    return false;
  }
};
