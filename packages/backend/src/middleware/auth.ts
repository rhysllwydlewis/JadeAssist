/**
 * Authentication middleware
 */
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { API_MESSAGES, ERROR_CODES } from '../utils/constants';

export interface AuthRequest extends Request {
  userId?: string;
  user?: {
    id: string;
    email?: string;
  };
}

/**
 * JWT authentication middleware
 */
export const authenticateJWT = (req: AuthRequest, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: {
          code: ERROR_CODES.UNAUTHORIZED,
          message: API_MESSAGES.UNAUTHORIZED,
        },
      });
      return;
    }

    const token = authHeader.substring(7);

    const decoded = jwt.verify(token, env.auth.jwtSecret) as {
      userId: string;
      email?: string;
    };

    req.userId = decoded.userId;
    req.user = {
      id: decoded.userId,
      email: decoded.email,
    };

    next();
  } catch (error) {
    logger.warn({ error }, 'JWT authentication failed');
    res.status(401).json({
      success: false,
      error: {
        code: ERROR_CODES.UNAUTHORIZED,
        message: API_MESSAGES.UNAUTHORIZED,
      },
    });
  }
};

/**
 * Optional authentication - doesn't fail if no token
 */
export const optionalAuth = (req: AuthRequest, _res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, env.auth.jwtSecret) as {
        userId: string;
        email?: string;
      };

      req.userId = decoded.userId;
      req.user = {
        id: decoded.userId,
        email: decoded.email,
      };
    }

    next();
  } catch (error) {
    // Just log and continue without authentication
    logger.debug({ error }, 'Optional auth failed, continuing without auth');
    next();
  }
};
