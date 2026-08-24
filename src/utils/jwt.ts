import jwt from 'jsonwebtoken';
import { JwtPayload } from '../types';
import { config } from '../config/env';

/**
 * Generate an access token (short-lived: 1 hour)
 * @param payload - User information to encode
 * @returns JWT access token
 */
export const generateToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: '1h',
  } as any);
};

/**
 * Generate a refresh token (long-lived: 30 days)
 * @param payload - User information to encode
 * @returns JWT refresh token
 */
export const generateRefreshToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: '30d',
  } as any);
};

/**
 * Verify and decode a JWT token
 * @param token - JWT token string
 * @returns Decoded payload
 * @throws Error if token is invalid or expired
 */
export const verifyToken = (token: string): JwtPayload => {
  try {
    const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
    return decoded;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};
