/**
 * Validation middleware using Zod
 */
import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';
import { logger } from '../utils/logger';
import { ERROR_CODES, API_MESSAGES } from '../utils/constants';
import { ApiResponse } from '@jadeassist/shared';

/**
 * Validate request body
 */
export const validateBody =
  <T>(schema: ZodSchema<T>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const validated = schema.parse(req.body);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      req.body = validated;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        logger.warn({ error: error.errors, body: req.body }, 'Validation error');

        const response: ApiResponse = {
          success: false,
          error: {
            code: ERROR_CODES.VALIDATION_ERROR,
            message: API_MESSAGES.VALIDATION_ERROR,
            details: {
              errors: error.errors,
            },
          },
          timestamp: new Date().toISOString(),
        };

        res.status(400).json(response);
        return;
      }

      next(error);
    }
  };

/**
 * Validate query parameters
 */
export const validateQuery =
  <T>(schema: ZodSchema<T>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    try {
      const validated = schema.parse(req.query);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
      req.query = validated as any;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        logger.warn({ error: error.errors, query: req.query }, 'Query validation error');

        const response: ApiResponse = {
          success: false,
          error: {
            code: ERROR_CODES.VALIDATION_ERROR,
            message: API_MESSAGES.VALIDATION_ERROR,
            details: {
              errors: error.errors,
            },
          },
          timestamp: new Date().toISOString(),
        };

        res.status(400).json(response);
        return;
      }

      next(error);
    }
  };

/**
 * Validate URL parameters
 */
export const validateParams =
  <T>(schema: ZodSchema<T>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    try {
      const validated = schema.parse(req.params);
      req.params = validated as Record<string, string>;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        logger.warn({ error: error.errors, params: req.params }, 'Params validation error');

        const response: ApiResponse = {
          success: false,
          error: {
            code: ERROR_CODES.VALIDATION_ERROR,
            message: API_MESSAGES.VALIDATION_ERROR,
            details: {
              errors: error.errors,
            },
          },
          timestamp: new Date().toISOString(),
        };

        res.status(400).json(response);
        return;
      }

      next(error);
    }
  };
