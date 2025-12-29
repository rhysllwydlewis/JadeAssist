/**
 * Error handling middleware
 */
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { ERROR_CODES, API_MESSAGES } from '../utils/constants';
import { ApiResponse } from '@jadeassist/shared';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Global error handler
 */
export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  logger.error(
    {
      err,
      url: req.url,
      method: req.method,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      body: req.body,
    },
    'Error occurred'
  );

  if (err instanceof AppError) {
    const response: ApiResponse = {
      success: false,
      error: {
        code: err.code,
        message: err.message,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        details: err.details,
      },
      timestamp: new Date().toISOString(),
    };

    res.status(err.statusCode).json(response);
    return;
  }

  // Unknown error
  const response: ApiResponse = {
    success: false,
    error: {
      code: ERROR_CODES.INTERNAL_ERROR,
      message: API_MESSAGES.INTERNAL_ERROR,
    },
    timestamp: new Date().toISOString(),
  };

  res.status(500).json(response);
};

/**
 * 404 handler
 */
export const notFoundHandler = (req: Request, res: Response): void => {
  const response: ApiResponse = {
    success: false,
    error: {
      code: ERROR_CODES.NOT_FOUND,
      message: API_MESSAGES.NOT_FOUND,
      details: {
        path: req.path,
        method: req.method,
      },
    },
    timestamp: new Date().toISOString(),
  };

  res.status(404).json(response);
};

/**
 * Async handler wrapper
 */
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
