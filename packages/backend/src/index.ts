/**
 * JadeAssist Backend Server
 * Main entry point
 */
import express, { Application, Request, Response } from 'express';
import cors, { CorsOptions } from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import { connectDatabase, closeDatabaseConnections } from './config/database';
import { logger } from './utils/logger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { requestId } from './middleware/requestId';
import { RATE_LIMITS } from './utils/constants';
import { resolveAllowedOrigins } from './utils/cors';

// Import routes
import healthRouter from './routes/health';
import chatRouter from './routes/chat';
import planningRouter from './routes/planning';
import assistRouter from './routes/assist';
import catalogRouter from './routes/catalog';
import searchRouter from './routes/search';
import widgetChatRouter from './routes/widgetChat';

// Create Express app
const app: Application = express();

// Trust the first proxy hop — required on Railway (and similar PaaS platforms)
// so that express-rate-limit can read the real client IP from X-Forwarded-For.
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());

// ── CORS ──────────────────────────────────────────────────────────────────────
const allowedOrigins = resolveAllowedOrigins(env.corsOrigin, env.isProduction);
const corsOptions: CorsOptions = {
  origin: allowedOrigins,
  credentials: allowedOrigins !== '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 204,
};

// Explicitly handle the embedded widget preflight before rate limiting or route
// matching. The EventFlow browser failure was an OPTIONS 404 for this endpoint.
app.options('/api/widget/chat', cors(corsOptions), (_req: Request, res: Response) => {
  res.sendStatus(204);
});

// Respond to OPTIONS preflight requests immediately.
app.options('*', cors(corsOptions));

// Attach CORS headers to every real request as well.
app.use(cors(corsOptions));

// Ensure widget chat responses always receive CORS headers before route limits.
app.use('/api/widget/chat', cors(corsOptions));

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
  res.status(200).json({
    ok: true,
    minimalMode: env.minimalMode,
    minimalModeSetting: env.minimalModeSetting,
    serviceConfigured: env.serviceConfigured,
    missingRequiredVars: env.missingRequiredVars,
  });
});

// Root endpoint — always mounted
app.get('/', (_req, res) => {
  res.json({
    name: 'JadeAssist API',
    version: '1.0.0',
    status: env.minimalMode ? 'minimal' : 'running',
    minimalMode: env.minimalMode,
    minimalModeSetting: env.minimalModeSetting,
    serviceConfigured: env.serviceConfigured,
    missingRequiredVars: env.missingRequiredVars,
    documentation: '/health',
  });
});

// ── Feature routes ─────────────────────────────────────────────────────────────
// In minimal mode the service may be missing required vars, or minimal mode may
// have been forced. Rather than hiding routes behind 404s, return explicit 503s.
if (env.minimalMode) {
  const unconfiguredHandler = (_req: Request, res: Response): void => {
    const forcedWithSecrets = env.forcedMinimalMode && env.serviceConfigured;
    res.status(503).json({
      success: false,
      error: {
        code: 'SERVICE_NOT_CONFIGURED',
        message: forcedWithSecrets
          ? 'JadeAssist is configured, but JADEASSIST_MINIMAL_MODE is forcing feature routes off. Set JADEASSIST_MINIMAL_MODE=auto or false to enable the agent.'
          : 'JadeAssist is waiting for required configuration before this endpoint can run.',
        missingVars: env.missingRequiredVars,
        minimalMode: env.minimalMode,
        minimalModeSetting: env.minimalModeSetting,
        serviceConfigured: env.serviceConfigured,
      },
      timestamp: new Date().toISOString(),
    });
  };

  app.use('/api/chat', unconfiguredHandler);
  app.use('/api/planning', unconfiguredHandler);
  app.use('/api/v1/assist', unconfiguredHandler);
  app.use('/api/search', unconfiguredHandler);
  app.use('/api/widget/chat', unconfiguredHandler);
} else {
  app.use('/api/chat', chatRouter);
  app.use('/api/planning', planningRouter);
  app.use('/api/v1/assist', assistRouter);
  app.use('/api/search', searchRouter);
  app.use('/api/widget/chat', widgetChatRouter);
}

// Catalog routes — always mounted (returns 503 when env vars are absent)
app.use('/api/catalog', catalogRouter);

// 404 handler
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

// ── Database initialisation ───────────────────────────────────────────────────
// Connect when a DB URL is present. In auto/full mode the chat route can still
// answer statelessly if MongoDB is slow or temporarily unavailable.
if (env.databaseUrl) {
  const { SupplierModel } = require('./models/Supplier') as typeof import('./models/Supplier');
  connectDatabase()
    .then(() => SupplierModel.seedIfEmpty())
    .catch((err: unknown) => {
      logger.error({ err }, 'Failed to connect to MongoDB on startup; chat will run statelessly until DB is available');
    });
}

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  logger.info(`${signal} received, starting graceful shutdown`);

  server.close(() => {
    logger.info('HTTP server closed');
  });

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
      minimalModeSetting: env.minimalModeSetting,
      serviceConfigured: env.serviceConfigured,
      missingRequiredVars: env.missingRequiredVars,
    },
    env.minimalMode
      ? '🚀 JadeAssist API server started in minimal mode'
      : '🚀 JadeAssist API server started with feature routes enabled'
  );

  logger.info(
    {
      health: `http://localhost:${env.port}/health`,
      healthz: `http://localhost:${env.port}/healthz`,
      assist: `http://localhost:${env.port}/api/v1/assist`,
      search: `http://localhost:${env.port}/api/search`,
      widgetChat: `http://localhost:${env.port}/api/widget/chat`,
    },
    '📍 API endpoints'
  );
});

export default app;
