/**
 * Environment Configuration
 * Centraliza todas las variables de entorno con validación y valores por defecto
 */

import dotenv from 'dotenv';
import path from 'path';

// Cargar variables de entorno según el entorno
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
dotenv.config({ path: path.resolve(process.cwd(), envFile) });

/**
 * Obtiene una variable de entorno con valor por defecto
 */
function getEnv(key: string, defaultValue: string = ''): string {
  return process.env[key] || defaultValue;
}

/**
 * Obtiene una variable de entorno como número
 */
function getEnvNumber(key: string, defaultValue: number): number {
  const value = process.env[key];
  return value ? parseInt(value, 10) : defaultValue;
}

/**
 * Obtiene una variable de entorno como booleano
 */
function getEnvBoolean(key: string, defaultValue: boolean): boolean {
  const value = process.env[key];
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true';
}

/**
 * Configuración del servidor
 */
export const serverConfig = {
  port: getEnvNumber('PORT', 3010),
  host: getEnv('HOST', '0.0.0.0'),
  nodeEnv: getEnv('NODE_ENV', 'development'),
  isDevelopment: getEnv('NODE_ENV', 'development') === 'development',
  isProduction: getEnv('NODE_ENV', 'development') === 'production',
  isTest: getEnv('NODE_ENV', 'development') === 'test',
};

/**
 * Configuración de la base de datos
 */
export const databaseConfig = {
  path: getEnv('DB_PATH', './database/inventory.sqlite'),
  logging: getEnvBoolean('DB_LOGGING', true),
  sync: getEnvBoolean('DB_SYNC', true),
  forceSync: getEnvBoolean('DB_FORCE_SYNC', false),
};

/**
 * Configuración de JWT
 */
export const jwtConfig = {
  secret: getEnv('JWT_SECRET', 'your-secret-key-change-this-in-production'),
  expiresIn: getEnv('JWT_EXPIRES_IN', '24h'),
  refreshExpiresIn: getEnv('JWT_REFRESH_EXPIRES_IN', '7d'),
};

/**
 * Configuración de CORS
 */
export const corsConfig = {
  origin: getEnv('CORS_ORIGIN', 'http://localhost:8080').split(',').map(o => o.trim()),
  credentials: true,
};

/**
 * Configuración de logging
 */
export const loggingConfig = {
  level: getEnv('LOG_LEVEL', 'info'),
  toFile: getEnvBoolean('LOG_TO_FILE', false),
  filePath: getEnv('LOG_FILE_PATH', './logs/app.log'),
};

/**
 * Configuración de subida de archivos
 */
export const uploadConfig = {
  dir: getEnv('UPLOAD_DIR', './uploads'),
  baseUrl: getEnv('UPLOAD_BASE_URL', 'http://localhost:3010'),
  maxFileSize: getEnvNumber('MAX_FILE_SIZE', 5242880), // 5MB
  allowedTypes: getEnv('ALLOWED_FILE_TYPES', 'image/jpeg,image/png,image/gif,image/webp')
    .split(',')
    .map(t => t.trim()),
};

/**
 * Configuración de seguridad
 */
export const securityConfig = {
  rateLimitEnabled: getEnvBoolean('RATE_LIMIT_ENABLED', true),
  rateLimitMax: getEnvNumber('RATE_LIMIT_MAX', 100),
  rateLimitWindow: getEnvNumber('RATE_LIMIT_WINDOW', 15),
  helmetEnabled: getEnvBoolean('HELMET_ENABLED', true),
};

/**
 * Configuración de email
 */
export const emailConfig = {
  enabled: getEnvBoolean('EMAIL_ENABLED', false),
  host: getEnv('EMAIL_HOST', 'smtp.gmail.com'),
  port: getEnvNumber('EMAIL_PORT', 587),
  secure: getEnvBoolean('EMAIL_SECURE', false),
  user: getEnv('EMAIL_USER', ''),
  password: getEnv('EMAIL_PASSWORD', ''),
  from: getEnv('EMAIL_FROM', 'Sistema de Inventario <noreply@inventario.com>'),
};

/**
 * Configuración de notificaciones
 */
export const notificationConfig = {
  enabled: getEnvBoolean('NOTIFICATIONS_ENABLED', true),
  expiryWarningDays: getEnvNumber('EXPIRY_WARNING_DAYS', 7),
  lowStockThreshold: getEnvNumber('LOW_STOCK_THRESHOLD', 20),
};

/**
 * Configuración de sesión
 */
export const sessionConfig = {
  inactivityTimeout: getEnvNumber('SESSION_INACTIVITY_TIMEOUT', 180000), // 3 minutos
};

/**
 * Configuración de API
 */
export const apiConfig = {
  prefix: getEnv('API_PREFIX', '/api'),
  version: getEnv('API_VERSION', 'v1'),
};

/**
 * Configuración de frontend
 */
export const frontendConfig = {
  url: getEnv('FRONTEND_URL', 'http://localhost:8080'),
};

/**
 * Configuración de backup
 */
export const backupConfig = {
  enabled: getEnvBoolean('BACKUP_ENABLED', false),
  dir: getEnv('BACKUP_DIR', './backups'),
  interval: getEnvNumber('BACKUP_INTERVAL', 24),
};

/**
 * Configuración completa exportada
 */
export const config = {
  server: serverConfig,
  database: databaseConfig,
  jwt: jwtConfig,
  cors: corsConfig,
  logging: loggingConfig,
  upload: uploadConfig,
  security: securityConfig,
  email: emailConfig,
  notification: notificationConfig,
  session: sessionConfig,
  api: apiConfig,
  frontend: frontendConfig,
  backup: backupConfig,
};

/**
 * Valida que las variables de entorno críticas estén configuradas
 */
export function validateEnv(): void {
  const errors: string[] = [];

  // Validar JWT_SECRET en producción
  if (serverConfig.isProduction && jwtConfig.secret === 'your-secret-key-change-this-in-production') {
    errors.push('JWT_SECRET must be changed in production');
  }

  // Validar que JWT_SECRET tenga longitud mínima
  if (jwtConfig.secret.length < 32) {
    errors.push('JWT_SECRET must be at least 32 characters long');
  }

  // Validar CORS_ORIGIN en producción
  if (serverConfig.isProduction && corsConfig.origin.includes('http://localhost')) {
    errors.push('CORS_ORIGIN should not include localhost in production');
  }

  // Validar configuración de email si está habilitado
  if (emailConfig.enabled && (!emailConfig.user || !emailConfig.password)) {
    errors.push('EMAIL_USER and EMAIL_PASSWORD are required when EMAIL_ENABLED is true');
  }

  if (errors.length > 0) {
    console.error('❌ Environment validation errors:');
    errors.forEach(error => console.error(`  - ${error}`));
    
    if (serverConfig.isProduction) {
      throw new Error('Environment validation failed. Fix the errors above.');
    } else {
      console.warn('⚠️  Environment validation warnings (non-critical in development)');
    }
  } else {
    console.log('✅ Environment variables validated successfully');
  }
}

/**
 * Imprime la configuración actual (sin valores sensibles)
 */
export function printConfig(): void {
  console.log('\n📋 Current Configuration:');
  console.log('  Environment:', serverConfig.nodeEnv);
  console.log('  Server:', `${serverConfig.host}:${serverConfig.port}`);
  console.log('  Database:', databaseConfig.path);
  console.log('  CORS Origin:', corsConfig.origin.join(', '));
  console.log('  API Prefix:', apiConfig.prefix);
  console.log('  Upload Dir:', uploadConfig.dir);
  console.log('  Max File Size:', `${uploadConfig.maxFileSize / 1024 / 1024}MB`);
  console.log('  Rate Limiting:', securityConfig.rateLimitEnabled ? 'Enabled' : 'Disabled');
  console.log('  Notifications:', notificationConfig.enabled ? 'Enabled' : 'Disabled');
  console.log('  Email:', emailConfig.enabled ? 'Enabled' : 'Disabled');
  console.log('  Backup:', backupConfig.enabled ? 'Enabled' : 'Disabled');
  console.log('');
}

// Exportar por defecto
export default config;
