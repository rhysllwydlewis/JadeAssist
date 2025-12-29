/**
 * Health check route
 */
import { Router, Request, Response } from 'express';
import { checkDatabaseHealth } from '../config/database';
import { llmService } from '../services/llmService';
import { HealthCheckResponse, ApiResponse } from '@jadeassist/shared';
import { asyncHandler } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const router = Router();

/**
 * GET /health
 * Health check endpoint
 */
router.get(
  '/',
  asyncHandler(async (_req: Request, res: Response) => {
    logger.debug('Health check requested');

    const startTime = Date.now();

    // Check database
    const dbHealthy = await checkDatabaseHealth();

    // Check LLM service
    const llmHealthy = await llmService.healthCheck();

    const uptime = process.uptime();
    const status = dbHealthy && llmHealthy ? 'healthy' : 'unhealthy';

    const healthResponse: HealthCheckResponse = {
      status,
      timestamp: new Date().toISOString(),
      uptime,
      version: '1.0.0',
      services: {
        database: dbHealthy ? 'up' : 'down',
        llm: llmHealthy ? 'up' : 'down',
      },
    };

    const response: ApiResponse<HealthCheckResponse> = {
      success: status === 'healthy',
      data: healthResponse,
      timestamp: new Date().toISOString(),
    };

    const statusCode = status === 'healthy' ? 200 : 503;

    logger.info(
      {
        status,
        duration: Date.now() - startTime,
        services: healthResponse.services,
      },
      'Health check completed'
    );

    res.status(statusCode).json(response);
  })
);

/**
 * GET /health/ready
 * Readiness check endpoint for Kubernetes/container orchestration
 */
router.get(
  '/ready',
  asyncHandler(async (_req: Request, res: Response) => {
    logger.debug('Readiness check requested');

    // Check if critical services are ready
    const dbHealthy = await checkDatabaseHealth();
    const llmHealthy = await llmService.healthCheck();

    const ready = dbHealthy && llmHealthy;

    const response: ApiResponse = {
      success: ready,
      data: {
        ready,
        services: {
          database: dbHealthy ? 'ready' : 'not ready',
          llm: llmHealthy ? 'ready' : 'not ready',
        },
      },
      timestamp: new Date().toISOString(),
    };

    const statusCode = ready ? 200 : 503;

    logger.info({ ready }, 'Readiness check completed');

    res.status(statusCode).json(response);
  })
);

export default router;
