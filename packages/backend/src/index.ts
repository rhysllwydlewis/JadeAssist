/**
 * JadeAssist Backend Server
 * Main entry point
 */
import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import { getPool, closeDatabaseConnections } from './config/database';
import { logger } from './utils/logger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { requestId } from './middleware/requestId';
import { RATE_LIMITS } from './utils/constants';

// Import routes
import healthRouter from './routes/health';
import chatRouter from './routes/chat';
import planningRouter from './routes/planning';
import assistRouter from './routes/assist';
import catalogRouter from './routes/catalog';
import widgetChatRouter from './routes/widgetChat';

// Create Express app
const app: Application = express();

// Trust the first proxy hop — required on Railway (and similar PaaS platforms)
// so that express-rate-limit can read the real client IP from X-Forwarded-For
// instead of logging ERR_ERL_UNEXPECTED_X_FORWARDED_FOR warnings.
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());

// Parse CORS_ORIGIN: '*' means allow all; otherwise treat as comma-separated list
const corsOrigins = env.corsOrigin.trim();
app.use(
  cors({
    origin: corsOrigins === '*' ? '*' : corsOrigins.split(',').map((o) => o.trim()).filter((o) => o.length > 0),
    credentials: corsOrigins !== '*',
  })
);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request-ID — must come before logging so the ID is available in logs
app.use(requestId);

// Global rate limiting
const globalLimiter = rateLimit({
  windowMs: RATE_LIMITS.DEFAULT.windowMs,
  max: RATE_LIMITS.DEFAULT.max,
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(globalLimiter);

// Request logging
app.use((req, res, next) => {
  const reqId = String(res.locals['requestId'] ?? '');
  logger.info(
    {
      requestId: reqId,
      method: req.method,
      path: req.path,
      query: req.query,
      ip: req.ip,
    },
    'Incoming request'
  );
  next();
});

// ── Health routes — always mounted ────────────────────────────────────────────
app.use('/health', healthRouter);

// Railway / k8s health probe — lightweight, no DB check, always up
app.get('/healthz', (_req, res) => {
  res.status(200).json({ ok: true, minimalMode: env.minimalMode });
});

// Root endpoint — always mounted
app.get('/', (_req, res) => {
  res.json({
    name: 'JadeAssist API',
    version: '1.0.0',
    status: env.minimalMode ? 'minimal' : 'running',
    minimalMode: env.minimalMode,
    documentation: '/health',
  });
});

// ── Feature routes ─────────────────────────────────────────────────────────────
// In minimal mode the service may be missing DATABASE_URL / OPENAI_API_KEY /
// JWT_SECRET.  Rather than not mounting these routes at all (which makes
// misconfiguration hard to debug) we return a clear 503 with guidance.
if (env.minimalMode) {
  const REQUIRED = ['DATABASE_URL', 'OPENAI_API_KEY', 'JWT_SECRET'];
  const missingVars = REQUIRED.filter((v) => !process.env[v]);

  const unconfiguredHandler = (_req: Request, res: Response): void => {
    res.status(503).json({
      success: false,
      error: {
        code: 'SERVICE_NOT_CONFIGURED',
        message:
          'This endpoint requires DATABASE_URL, OPENAI_API_KEY, and JWT_SECRET. ' +
          'Configure the missing variables and set JADEASSIST_MINIMAL_MODE=false (or remove it) to enable full functionality.',
        missingVars,
      },
      timestamp: new Date().toISOString(),
    });
  };

  app.use('/api/chat', unconfiguredHandler);
  app.use('/api/planning', unconfiguredHandler);
  app.use('/api/v1/assist', unconfiguredHandler);
  app.use('/api/widget/chat', unconfiguredHandler);
} else {
  app.use('/api/chat', chatRouter);
  app.use('/api/planning', planningRouter);
  app.use('/api/v1/assist', assistRouter);
  app.use('/api/widget/chat', widgetChatRouter);
}

// Catalog routes — always mounted (returns 503 when env vars are absent)
app.use('/api/catalog', catalogRouter);

// 404 handler
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

// ── Database initialisation ───────────────────────────────────────────────────
// Only create the pool when DATABASE_URL is present and we are not in minimal
// mode (avoids a throw/crash on startup).
if (!env.minimalMode && env.databaseUrl) {
  getPool();
}

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  logger.info(`${signal} received, starting graceful shutdown`);

  // Stop accepting new connections
  server.close(() => {
    logger.info('HTTP server closed');
  });

  // Close database connections
  await closeDatabaseConnections();

  logger.info('Graceful shutdown complete');
  process.exit(0);
};

// Handle shutdown signals
process.on('SIGTERM', () => void gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => void gracefulShutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logger.error({ error }, 'Uncaught exception');
  void gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error({ reason, promise }, 'Unhandled rejection');
  void gracefulShutdown('unhandledRejection');
});

// Start server
const server = app.listen(env.port, () => {
  logger.info(
    {
      port: env.port,
      nodeEnv: env.nodeEnv,
      version: '1.0.0',
      minimalMode: env.minimalMode,
    },
    env.minimalMode
      ? '🚀 JadeAssist API server started (minimal mode — feature routes return 503 until secrets are configured)'
      : '🚀 JadeAssist API server started'
  );

  logger.info(
    {
      health: `http://localhost:${env.port}/health`,
      healthz: `http://localhost:${env.port}/healthz`,
      assist: `http://localhost:${env.port}/api/v1/assist`,
    },
    '📍 API endpoints'
  );
});

export default app;
