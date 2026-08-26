import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { initializeDatabase } from './models';
import routes from './routes';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './middleware/logger';
import { apiLimiter } from './middleware/rateLimiter';
import { AppError } from './types';
import { config, validateEnv, printConfig } from './config/env';
import { initRedis, closeRedis } from './config/redis';
import { scheduleDailyRateUpdate } from './services/exchangeRateService';
import { initSocket, startNotificationChecks, stopNotificationChecks } from './services/notificationService';
import { seedDefaultCategoriesForAllUsers } from './services/categoryService';

/**
 * Create Express application
 */
const app = express();

// Confía en 1 proxy (Docker/nginx) para que express-rate-limit
// use la IP real del cliente y no emita ERR_ERL_PERMISSIVE_TRUST_PROXY
app.set('trust proxy', Number(process.env.TRUST_PROXY ?? 1));

// Trust proxy settings:
// - 'loopback': trusts 127.0.0.1/8 and ::1 (local proxies)
// - For production behind a known proxy, use the number of proxy hops:
//   app.set('trust proxy', 1)  // e.g. 1 reverse proxy
// See: https://expressjs.com/en/guide/behind-proxies.html
const trustProxy = config.server.isProduction ? 1 : 'loopback';
app.set('trust proxy', trustProxy);

/**
 * Configure CORS
 * Configuración unificada para requests normales y preflight OPTIONS
 */
const corsOptions: cors.CorsOptions = {
  origin: function (origin, callback) {
    // Permitir requests sin origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);

    const allowedOrigins = config.cors.origin;

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn(`⚠️  CORS blocked request from origin: ${origin}`);
      console.warn(`⚠️  Allowed origins: ${allowedOrigins.join(', ')}`);
      callback(new Error(`CORS: origin "${origin}" not allowed`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 86400, // 24 horas cache del preflight
};

// Aplicar CORS a todas las rutas
app.use(cors(corsOptions));

// Manejar preflight OPTIONS con la MISMA configuración (crítico para CORS)
app.options('*', cors(corsOptions));

/**
 * Helmet - Security headers
 */
if (config.security.helmetEnabled) {
  app.use(helmet({
    contentSecurityPolicy: false, // Deshabilitar CSP para permitir imágenes de uploads
    crossOriginEmbedderPolicy: false,
  }));
  console.log('🔒 Helmet security headers enabled');
}

/**
 * Body parser middleware
 */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/**
 * Logger middleware
 */
app.use(logger);

/**
 * Rate limiting general para todas las rutas API
 */
if (config.security.rateLimitEnabled) {
  app.use(config.api.prefix, apiLimiter);
  console.log(`🛡️  Rate limiting enabled: ${config.security.rateLimitMax} requests per ${config.security.rateLimitWindow} minutes`);
}

/**
 * Serve static files (uploaded images)
 * Use absolute path resolution to work in both development and production
 */
const getUploadsPath = (): string => {
  const uploadDir = config.upload.dir;
  
  // If it's an absolute path, use it directly
  if (path.isAbsolute(uploadDir)) {
    return uploadDir;
  }
  
  // If it's a relative path, resolve it from the project root
  return path.join(process.cwd(), uploadDir);
};

const uploadsPath = getUploadsPath();
console.log(`📁 Serving static files from: ${uploadsPath}`);
app.use('/backendanalis/uploads', express.static(uploadsPath));
app.use('/uploads', express.static(uploadsPath));

/**
 * Health check endpoint
 */
app.get('/backendanalis/health', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: config.server.nodeEnv,
  });
});
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: config.server.nodeEnv,
  });
});

/**
 * API routes
 */
//RUTAS PARA PROXY
app.use(`/backendanalis${config.api.prefix}`, routes);

app.use(config.api.prefix, routes);

/**
 * 404 handler for undefined routes
 */
app.use((req: Request, _res: Response, next: NextFunction) => {
  next(new AppError(`Route ${req.method} ${req.path} not found`, 404));
});

/**
 * Global error handler
 */
app.use(errorHandler);

/**
 * Start server
 */
const startServer = async () => {
  try {
    // Validate environment variables
    console.log('Validating environment variables...');
    validateEnv();

    // Print configuration
    printConfig();

    // Initialize database without forcing or altering
    console.log('Initializing database...');
    await initializeDatabase({
      force: config.database.forceSync,
      alter: config.database.alterSync,
    });

    // Seed default categories for users who don't have any
    await seedDefaultCategoriesForAllUsers();

    // Initialize Redis cache
    await initRedis();

    // Start the daily exchange rate scheduler (fetches immediately + schedules 00:00 daily)
    scheduleDailyRateUpdate();

    // Start HTTP server + Socket.io
    const httpServer = app.listen(config.server.port, () => {
      console.log(`✅ Server running in ${config.server.nodeEnv} mode on port ${config.server.port}`);
      console.log(`✅ CORS enabled for origins: ${config.cors.origin.join(', ')}`);
      console.log(`✅ API available at: ${config.api.prefix}`);
    });

    // Initialize Socket.io
    initSocket(httpServer);

    // Start periodic notification checks
    startNotificationChecks();
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

/**
 * Graceful shutdown handlers
 */
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  stopNotificationChecks();
  await closeRedis();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT signal received: closing HTTP server');
  stopNotificationChecks();
  await closeRedis();
  process.exit(0);
});

// Start the server
startServer();

export default app;
