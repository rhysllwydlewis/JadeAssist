/**
 * Database configuration and connection pool
 */
import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from './env';
import { logger } from '../utils/logger';

// PostgreSQL connection pool
let pool: Pool | null = null;

export const getPool = (): Pool => {
  if (!pool) {
    if (!env.databaseUrl) {
      throw new Error('DATABASE_URL is not configured');
    }
    pool = new Pool({
      connectionString: env.databaseUrl,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    pool.on('error', (err) => {
      logger.error({ err }, 'Unexpected database error');
    });

    logger.info('Database pool created');
  }

  return pool;
};

// Database query helper
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const query = async <T extends QueryResultRow = any>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> => {
  const start = Date.now();
  const pool = getPool();

  try {
    const result = await pool.query<T>(text, params);
    const duration = Date.now() - start;
    logger.debug({ text, duration, rows: result.rowCount }, 'Database query executed');
    return result;
  } catch (error) {
    logger.error({ error, text }, 'Database query error');
    throw error;
  }
};

// Transaction helper
export const transaction = async <T>(callback: (client: PoolClient) => Promise<T>): Promise<T> => {
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error({ error }, 'Transaction rolled back');
    throw error;
  } finally {
    client.release();
  }
};

// Supabase client (optional)
let supabaseClient: SupabaseClient | null = null;

export const getSupabaseClient = (): SupabaseClient | null => {
  if (!env.supabase.url || !env.supabase.anonKey) {
    return null;
  }

  if (!supabaseClient) {
    supabaseClient = createClient(env.supabase.url, env.supabase.anonKey);
    logger.info('Supabase client created');
  }

  return supabaseClient;
};

// Health check
export const checkDatabaseHealth = async (): Promise<boolean> => {
  if (!env.databaseUrl) {
    return false;
  }
  try {
    await query('SELECT 1');
    return true;
  } catch (error) {
    logger.error({ error }, 'Database health check failed');
    return false;
  }
};

/** Core tables that must exist for JadeAssist to function. */
const CORE_TABLES = ['users', 'conversations', 'messages', 'event_plans', 'suppliers'];

/**
 * Checks whether the core JadeAssist tables are present in the database.
 *
 * Returns an array of table names that are missing.  An empty array means the
 * schema is fully initialised.  Call this only after checkDatabaseHealth()
 * has confirmed the database is reachable.
 */
export const checkDatabaseSchema = async (): Promise<string[]> => {
  try {
    const result = await query<{ table_name: string }>(
      `SELECT table_name
         FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = ANY($1)`,
      [CORE_TABLES]
    );
    const found = new Set(result.rows.map((r) => r.table_name));
    return CORE_TABLES.filter((t) => !found.has(t));
  } catch (error) {
    logger.error({ error }, 'Database schema check failed');
    // If the check itself errors, treat all tables as potentially missing.
    return CORE_TABLES;
  }
};

// Graceful shutdown
export const closeDatabaseConnections = async (): Promise<void> => {
  if (pool) {
    await pool.end();
    pool = null;
    logger.info('Database pool closed');
  }
};
