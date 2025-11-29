/**
 * Authentication Middleware
 * JWT token verification for protected routes
 */

import { NextFunction, Request, Response } from 'express';
import jwt, { SignOptions } from 'jsonwebtoken';
import { Environment } from '@config/environment';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    userName: string;
  };
}

export interface JwtPayload {
  userId: string;
  userName: string;
  iat?: number;
  exp?: number;
}

/**
 * Middleware to verify JWT access token
 */
export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'No token provided'
    });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, Environment.JWT_SECRET) as JwtPayload;
    req.user = {
      userId: decoded.userId,
      userName: decoded.userName
    };
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
      return;
    }

    res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid token'
    });
  }
}

/**
 * Generate access token
 */
export function generateAccessToken(userId: string, userName: string): string {
  return jwt.sign(
    { userId, userName },
    Environment.JWT_SECRET,
    { expiresIn: Environment.JWT_EXPIRES_IN } as SignOptions
  );
}

/**
 * Generate refresh token
 */
export function generateRefreshToken(userId: string, userName: string): string {
  return jwt.sign(
    { userId, userName },
    Environment.JWT_REFRESH_SECRET,
    { expiresIn: Environment.JWT_REFRESH_EXPIRES_IN } as SignOptions
  );
}

/**
 * Verify refresh token
 */
export function verifyRefreshToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, Environment.JWT_REFRESH_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}
