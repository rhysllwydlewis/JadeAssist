/**
 * Database configuration — MongoDB via Mongoose
 */
import mongoose from 'mongoose';
import { env } from './env';
import { logger } from '../utils/logger';

// ── Connection ────────────────────────────────────────────────────────────────

/**
 * Connect to MongoDB.  Safe to call multiple times — subsequent calls are
 * no-ops if Mongoose is already connected.
 */
export const connectDatabase = async (): Promise<void> => {
  if (!env.databaseUrl) {
    throw new Error('MONGODB_URL is not configured');
  }
  if (mongoose.connection.readyState === 1) {
    return; // already connected
  }

  await mongoose.connect(env.databaseUrl, {
    serverSelectionTimeoutMS: 5000,
  });

  logger.info('MongoDB connected');
};

// ── Health check ──────────────────────────────────────────────────────────────

export const checkDatabaseHealth = async (): Promise<boolean> => {
  if (!env.databaseUrl) {
    return false;
  }
  try {
    if (mongoose.connection.readyState !== 1) {
      await connectDatabase();
    }
    const db = mongoose.connection.db;
    if (!db) {
      logger.error('MongoDB connection established but db handle is unavailable');
      return false;
    }
    // Ping the server to confirm connectivity
    await db.admin().ping();
    return true;
  } catch (error) {
    logger.error({ error }, 'Database health check failed');
    return false;
  }
};

/**
 * With MongoDB, collections are created automatically on first write — no
 * schema-migration step is required.  This function always returns an empty
 * array so the health endpoint reports no missing tables.
 */
export const checkDatabaseSchema = async (): Promise<string[]> => {
  return [];
};

// ── Graceful shutdown ─────────────────────────────────────────────────────────

export const closeDatabaseConnections = async (): Promise<void> => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed');
  }
};
