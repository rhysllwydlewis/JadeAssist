/**
 * JadeAssist Backend Server
 * Main entry point
 */
import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import { getPool, closeDatabaseConnections } from './config/database';
import { logger } from './utils/logger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { RATE_LIMITS } from './utils/constants';

// Import routes
import healthRouter from './routes/health';
import chatRouter from './routes/chat';
import planningRouter from './routes/planning';
import suppliersRouter from './routes/suppliers';
import analyticsRouter from './routes/analytics';

// Create Express app
const app: Application = express();

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: env.isDevelopment ? '*' : env.apiUrl,
    credentials: true,
  })
);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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
app.use((req, _res, next) => {
  logger.info(
    {
      method: req.method,
      path: req.path,
      query: req.query,
      ip: req.ip,
    },
    'Incoming request'
  );
  next();
});

// Mount routes
app.use('/health', healthRouter);
app.use('/api/chat', chatRouter);
app.use('/api/planning', planningRouter);
app.use('/api/suppliers', suppliersRouter);
app.use('/api/analytics', analyticsRouter);

// Root endpoint
app.get('/', (_req, res) => {
  res.json({
    name: 'JadeAssist API',
    version: '1.0.0',
    status: 'running',
    documentation: '/health',
  });
});

// 404 handler
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

// Initialize database pool
getPool();

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
    },
    '🚀 JadeAssist API server started'
  );

  logger.info(
    {
      health: `http://localhost:${env.port}/health`,
      api: `http://localhost:${env.port}/api`,
    },
    '📍 API endpoints'
  );
});

export default app;
