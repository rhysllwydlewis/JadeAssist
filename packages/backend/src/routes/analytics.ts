/**
 * Analytics routes - Metrics and tracking
 */
import { Router, Response } from 'express';
import { z } from 'zod';
import { AuthRequest, authenticateJWT } from '../middleware/auth';
import { validateQuery } from '../middleware/validation';
import { asyncHandler } from '../middleware/errorHandler';
import { analyticsService } from '../services/analyticsService';
import { ApiResponse } from '@jadeassist/shared';
import { logger } from '../utils/logger';

const router = Router();

// Validation schemas
const metricsQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

/**
 * GET /analytics/metrics
 * Get analytics metrics for a date range
 * Requires authentication and admin role (in production)
 */
router.get(
  '/metrics',
  authenticateJWT,
  validateQuery(metricsQuerySchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };

    // Default to last 30 days if not specified
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

    logger.debug({ startDate: start, endDate: end }, 'Fetching analytics metrics');

    const metrics = await analyticsService.getMetrics(start, end);

    const response: ApiResponse = {
      success: true,
      data: {
        period: {
          start: start.toISOString(),
          end: end.toISOString(),
        },
        metrics,
      },
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(response);
  })
);

/**
 * POST /analytics/track
 * Track a custom analytics event
 */
const trackEventSchema = z.object({
  eventName: z.string().min(1).max(100),
  properties: z.record(z.unknown()).optional(),
});

router.post(
  '/track',
  authenticateJWT,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { eventName, properties } = req.body as z.infer<typeof trackEventSchema>;
    const userId = req.userId!;

    logger.debug({ eventName, userId }, 'Tracking custom event');

    await analyticsService.trackEvent(eventName, userId, properties || {});

    const response: ApiResponse = {
      success: true,
      data: {
        tracked: true,
        eventName,
      },
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(response);
  })
);

export default router;
