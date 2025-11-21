/**
 * Authentication Routes
 * Login and token refresh endpoints
 */

import { Router, Request, Response } from 'express';
import { User } from '../../models';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken
} from '../middleware/auth.middleware';

const router = Router();

/**
 * POST /api/auth/login
 * Authenticate user and return tokens
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { userName, password } = req.body;

    if (!userName || !password) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Username and password are required'
      });
      return;
    }

    // Find user by userName
    const user = await User.findOne({ userName });

    if (!user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid username or password'
      });
      return;
    }

    // Simple password check (not hashed for POC)
    if (user.password !== password) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid username or password'
      });
      return;
    }

    // Generate tokens
    const accessToken = generateAccessToken(user.userId, user.userName);
    const refreshToken = generateRefreshToken(user.userId, user.userName);

    res.json({
      success: true,
      accessToken,
      refreshToken,
      user: {
        userId: user.userId,
        name: user.name,
        userName: user.userName
      }
    });
  } catch (error) {
    console.error('[Auth] Login error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Login failed'
    });
  }
});

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Refresh token is required'
      });
      return;
    }

    // Verify refresh token
    const payload = verifyRefreshToken(refreshToken);

    if (!payload) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired refresh token',
        code: 'REFRESH_TOKEN_EXPIRED'
      });
      return;
    }

    // Verify user still exists
    const user = await User.findOne({ userId: payload.userId });

    if (!user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User not found'
      });
      return;
    }

    // Generate new tokens
    const newAccessToken = generateAccessToken(user.userId, user.userName);
    const newRefreshToken = generateRefreshToken(user.userId, user.userName);

    res.json({
      success: true,
      accessToken: newAccessToken,
      refreshToken: newRefreshToken
    });
  } catch (error) {
    console.error('[Auth] Refresh error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Token refresh failed'
    });
  }
});

/**
 * GET /api/auth/me
 * Get current user info (requires auth)
 */
router.get('/me', async (req: Request, res: Response) => {
  // This endpoint will be protected by middleware
  // For now, extract token manually
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
    const jwt = await import('jsonwebtoken');
    const { env } = await import('../../config/env');

    const decoded = jwt.default.verify(token, env.JWT_SECRET) as { userId: string; userName: string };

    const user = await User.findOne({ userId: decoded.userId });

    if (!user) {
      res.status(404).json({
        error: 'Not Found',
        message: 'User not found'
      });
      return;
    }

    res.json({
      userId: user.userId,
      name: user.name,
      userName: user.userName
    });
  } catch {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid token'
    });
  }
});

export const authRoutes = router;
