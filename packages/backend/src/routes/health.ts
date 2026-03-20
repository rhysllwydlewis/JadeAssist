/**
 * Health check route
 */
import { Router, Request, Response } from 'express';
import { checkDatabaseHealth } from '../config/database';
import { llmService } from '../services/llmService';
import { HealthCheckResponse, ApiResponse } from '@jadeassist/shared';
import { asyncHandler } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { env } from '../config/env';

const router = Router();

/**
 * GET /health
 * Health check endpoint.
 *
 * In minimal mode the service reports 200/degraded — checks that require
 * DATABASE_URL or OPENAI_API_KEY are skipped rather than failing the
 * container.  This keeps Railway from marking the service as unhealthy
 * during first-time setup.
 */
router.get(
  '/',
  asyncHandler(async (_req: Request, res: Response) => {
    logger.debug('Health check requested');

    const startTime = Date.now();

    let dbHealthy: boolean;
    let llmHealthy: boolean;
    const skippedChecks: string[] = [];

    if (env.minimalMode) {
      // Skip checks that require unconfigured services
      if (!env.databaseUrl) {
        dbHealthy = false;
        skippedChecks.push('database (DATABASE_URL not set)');
      } else {
        dbHealthy = await checkDatabaseHealth();
      }

      if (!env.llm.apiKey) {
        llmHealthy = false;
        skippedChecks.push('llm (OPENAI_API_KEY not set)');
      } else {
        llmHealthy = await llmService.healthCheck();
      }
    } else {
      // Strict mode — run all checks normally
      dbHealthy = await checkDatabaseHealth();
      llmHealthy = await llmService.healthCheck();
    }

    const uptime = process.uptime();

    // Determine overall status
    let status: 'healthy' | 'unhealthy' | 'degraded';
    if (env.minimalMode) {
      if (skippedChecks.length > 0) {
        status = 'degraded';
      } else if (dbHealthy && llmHealthy) {
        status = 'healthy';
      } else {
        status = 'unhealthy';
      }
    } else {
      status = dbHealthy && llmHealthy ? 'healthy' : 'unhealthy';
    }

    const healthResponse: HealthCheckResponse & {
      minimalMode: boolean;
      skippedChecks?: string[];
    } = {
      status,
      timestamp: new Date().toISOString(),
      uptime,
      version: '1.0.0',
      minimalMode: env.minimalMode,
      services: {
        database: dbHealthy ? 'up' : 'down',
        llm: llmHealthy ? 'up' : 'down',
      },
      ...(skippedChecks.length > 0 && { skippedChecks }),
    };

    const response: ApiResponse<typeof healthResponse> = {
      success: status !== 'unhealthy',
      data: healthResponse,
      timestamp: new Date().toISOString(),
    };

    // Return 503 only in strict mode when truly unhealthy; degraded stays 200
    const statusCode = status === 'unhealthy' && !env.minimalMode ? 503 : 200;

    logger.info(
      {
        status,
        duration: Date.now() - startTime,
        services: healthResponse.services,
        minimalMode: env.minimalMode,
        ...(skippedChecks.length > 0 && { skippedChecks }),
      },
      'Health check completed'
    );

    res.status(statusCode).json(response);
  })
);

export default router;
