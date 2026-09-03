/**
 * Rate Limiting Middleware
 * Protects API from abuse and DDoS attacks
 */

import rateLimit from 'express-rate-limit';
import { config } from '../config/env';

/**
 * General rate limiter for all API routes
 * Limits: 1000 requests per 15 minutes per user
 */
export const apiLimiter = rateLimit({
  windowMs: config.security.rateLimitWindow * 60 * 1000, // minutes to ms
  max: 1000,
  keyGenerator: (req) => {
    return (req as any).user?.id || req.ip || 'unknown';
  },
  message: {
    success: false,
    error: 'Too many requests, please try again later.',
    retryAfter: `${config.security.rateLimitWindow} minutes`,
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path.includes('/health');
  },
});

/**
 * Strict rate limiter for auth routes (login, register)
 * Limits: 10 requests per 15 minutes per IP
 * Prevents brute force attacks
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: {
    success: false,
    error: 'Too many authentication attempts, please try again in 15 minutes.',
    retryAfter: '15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Upload rate limiter
 * Limits: 500 uploads per hour per user (keyGenerator uses userId from JWT)
 */
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 500,
  keyGenerator: (req) => {
    // Use userId from JWT if available, fallback to IP
    return (req as any).user?.id || req.ip || 'unknown';
  },
  message: {
    success: false,
    error: 'Too many file uploads, please try again later.',
    retryAfter: '1 hour',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
