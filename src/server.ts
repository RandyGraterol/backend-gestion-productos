import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import { initializeDatabase } from './models';
import routes from './routes';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './middleware/logger';
import { AppError } from './types';
import { config, validateEnv, printConfig } from './config/env';
import { scheduleDailyRateUpdate } from './services/exchangeRateService';

/**
 * Create Express application
 */
const app = express();

/**
 * Configure CORS
 * Configuración mejorada para manejar preflight requests
 */
app.use(
  cors({
    origin: function (origin, callback) {
      // Permitir requests sin origin (como mobile apps o curl)
      if (!origin) return callback(null, true);
      
      // Verificar si el origin está en la lista permitida
      const allowedOrigins = config.cors.origin;
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        console.warn(`⚠️  CORS blocked request from origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    maxAge: 86400, // 24 horas
  })
);

// Manejar explícitamente las peticiones OPTIONS (preflight)
app.options('*', cors());

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
    await initializeDatabase();

    // Start the daily exchange rate scheduler (fetches immediately + schedules 00:00 daily)
    scheduleDailyRateUpdate();

    // Start Express server
    app.listen(config.server.port, () => {
      console.log(`✅ Server running in ${config.server.nodeEnv} mode on port ${config.server.port}`);
      console.log(`✅ CORS enabled for origins: ${config.cors.origin.join(', ')}`);
      console.log(`✅ API available at: ${config.api.prefix}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

/**
 * Graceful shutdown handlers
 */
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  process.exit(0);
});

// Start the server
startServer();

export default app;
