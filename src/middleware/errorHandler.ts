import { Request, Response, NextFunction } from 'express';
import { AppError } from '../types';
import { ValidationError, UniqueConstraintError, ForeignKeyConstraintError } from 'sequelize';
import { config } from '../config/env';

/**
 * Error response interface
 */
interface ErrorResponse {
  success: false;
  error: string;
  details?: any;
  stack?: string;
}

/**
 * Global error handler middleware
 * Catches all errors from routes and transforms them into consistent HTTP responses
 */
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Default error values
  let statusCode = 500;
  let message = 'Internal server error';
  let details: any = undefined;

  // Log error with context
  console.error('[Error]', {
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
    error: err.message,
    stack: err.stack,
  });

  // Handle custom AppError
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
  }
  // Handle Sequelize validation errors
  else if (err instanceof ValidationError) {
    statusCode = 400;
    message = 'Validation error';
    details = err.errors.map((e) => ({
      field: e.path,
      message: e.message,
    }));
  }
  // Handle Sequelize unique constraint errors
  else if (err instanceof UniqueConstraintError) {
    statusCode = 409;
    message = 'A record with this value already exists';
    details = err.errors.map((e) => ({
      field: e.path,
      message: `${e.path} must be unique`,
    }));
  }
  // Handle Sequelize foreign key constraint errors
  else if (err instanceof ForeignKeyConstraintError) {
    statusCode = 400;
    message = 'Invalid reference to related resource';
    details = {
      constraint: err.message,
    };
  }
  // Handle generic errors
  else if (err.message) {
    // Check for specific error messages
    if (err.message.includes('not found') || err.message.includes('does not exist')) {
      statusCode = 404;
      message = err.message;
    } else if (err.message.includes('unauthorized') || err.message.includes('authentication')) {
      statusCode = 401;
      message = err.message;
    } else if (err.message.includes('forbidden') || err.message.includes('permission')) {
      statusCode = 403;
      message = err.message;
    } else {
      message = err.message;
    }
  }

  // Build error response
  const errorResponse: ErrorResponse = {
    success: false,
    error: message,
  };

  // Include details if available
  if (details) {
    errorResponse.details = details;
  }

  // Include stack trace in development mode
  if (config.server.isDevelopment) {
    errorResponse.stack = err.stack;
  }

  // Send error response
  res.status(statusCode).json(errorResponse);
};

/**
 * 404 Not Found handler for undefined routes
 */
export const notFoundHandler = (
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.path} not found`,
  });
};

/**
 * Async handler wrapper to catch errors in async route handlers
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
