/**
 * Environment configuration and validation
 *
 * Two modes:
 *   Strict (default) — MONGODB_URL, OPENAI_API_KEY, JWT_SECRET are required.
 *                      The process exits(1) if any are missing.
 *   Minimal (opt-in) — Set JADEASSIST_MINIMAL_MODE=true to allow the server to
 *                      start without the above vars. Routes that depend on them
 *                      return HTTP 503 until they are configured.
 */
import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables
dotenv.config();

// ── Step 1: read minimal-mode flag before full schema parse ──────────────────
const MINIMAL_MODE = process.env.JADEASSIST_MINIMAL_MODE === 'true';

// ── Step 2: schema — conditionally-required fields become optional in minimal ─
const envSchema = z.object({
  // Server
  PORT: z.string().default('3001'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  API_URL: z.string().default('http://localhost:3001'),
  JADEASSIST_MINIMAL_MODE: z.string().optional(),

  // Database — MONGODB_URL is the primary env var.  DATABASE_URL is accepted
  // as a legacy alias so existing Railway configs keep working without changes.
  MONGODB_URL: z.string().optional(),
  DATABASE_URL: z.string().optional(),

  // LLM — required in strict mode, optional in minimal
  OPENAI_API_KEY: MINIMAL_MODE ? z.string().optional() : z.string(),
  LLM_MODEL: z.string().default('gpt-4-turbo'),
  LLM_TOKEN_LIMIT: z.string().default('4000'),

  // Auth — required in strict mode, optional in minimal
  JWT_SECRET: MINIMAL_MODE ? z.string().optional() : z.string(),
  AUTH_PROVIDER: z.enum(['jwt', 'supabase', 'eventflow']).default('jwt'),

  // Event-flow integration
  EVENTFLOW_API_URL: z.string().optional(),
  EVENTFLOW_API_KEY: z.string().optional(),

  // EventFlow Catalog API (protected)
  EVENTFLOW_CATALOG_BASE_URL: z.string().optional(),
  EVENTFLOW_CATALOG_API_KEY: z.string().optional(),

  // CORS — comma-separated list of allowed origins, or '*' for all (default)
  CORS_ORIGIN: z.string().default('*'),

  // Logging
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

// ── Step 3: parse ────────────────────────────────────────────────────────────
const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsedEnv.error.format());
  process.exit(1);
}

// Resolve the DB URL: MONGODB_URL takes precedence over DATABASE_URL
const resolvedDbUrl = parsedEnv.data.MONGODB_URL ?? parsedEnv.data.DATABASE_URL;

// ── Step 4: strict-mode enforcement (fail-fast) ──────────────────────────────
if (!MINIMAL_MODE) {
  const missing: string[] = [];
  if (!resolvedDbUrl) missing.push('MONGODB_URL');
  if (!parsedEnv.data.OPENAI_API_KEY) missing.push('OPENAI_API_KEY');
  if (!parsedEnv.data.JWT_SECRET) missing.push('JWT_SECRET');

  if (missing.length > 0) {
    console.error(`❌ Missing required environment variables: ${missing.join(', ')}`);
    console.error('   Tip: set JADEASSIST_MINIMAL_MODE=true to start in minimal boot mode');
    console.error('   (health check endpoints stay up; feature routes return 503).');
    process.exit(1);
  }
}

// ── Step 5: minimal-mode warnings ────────────────────────────────────────────
if (MINIMAL_MODE) {
  const missing: string[] = [];
  if (!resolvedDbUrl) missing.push('MONGODB_URL');
  if (!parsedEnv.data.OPENAI_API_KEY) missing.push('OPENAI_API_KEY');
  if (!parsedEnv.data.JWT_SECRET) missing.push('JWT_SECRET');

  if (missing.length > 0) {
    console.warn('⚠️  JADEASSIST_MINIMAL_MODE is active.');
    console.warn(`⚠️  Missing vars: ${missing.join(', ')}`);
    console.warn(
      '⚠️  Disabled features: database queries, AI chat, JWT authentication.',
    );
    console.warn('⚠️  /healthz and / remain fully operational.');
    console.warn(
      '⚠️  Set the missing vars and remove JADEASSIST_MINIMAL_MODE to enable all features.',
    );
  }
}

// ── Step 6: export typed config ───────────────────────────────────────────────
export const env = {
  // Mode
  minimalMode: MINIMAL_MODE,

  // Server
  port: parseInt(parsedEnv.data.PORT, 10),
  nodeEnv: parsedEnv.data.NODE_ENV,
  apiUrl: parsedEnv.data.API_URL,
  isDevelopment: parsedEnv.data.NODE_ENV === 'development',
  isProduction: parsedEnv.data.NODE_ENV === 'production',
  isTest: parsedEnv.data.NODE_ENV === 'test',

  // Database URL (MongoDB) — string | undefined; always check before use in minimal mode
  databaseUrl: resolvedDbUrl as string | undefined,

  // LLM (string | undefined — always check before use in minimal mode)
  llm: {
    apiKey: parsedEnv.data.OPENAI_API_KEY as string | undefined,
    model: parsedEnv.data.LLM_MODEL,
    tokenLimit: parseInt(parsedEnv.data.LLM_TOKEN_LIMIT, 10),
  },

  // Auth (string | undefined — always check before use in minimal mode)
  auth: {
    jwtSecret: parsedEnv.data.JWT_SECRET as string | undefined,
    provider: parsedEnv.data.AUTH_PROVIDER,
  },

  // Event-flow integration
  eventflow: {
    apiUrl: parsedEnv.data.EVENTFLOW_API_URL,
    apiKey: parsedEnv.data.EVENTFLOW_API_KEY,
    catalog: {
      baseUrl: parsedEnv.data.EVENTFLOW_CATALOG_BASE_URL,
      apiKey: parsedEnv.data.EVENTFLOW_CATALOG_API_KEY,
    },
  },

  // CORS
  corsOrigin: parsedEnv.data.CORS_ORIGIN,

  // Logging
  logLevel: parsedEnv.data.LOG_LEVEL,
};
