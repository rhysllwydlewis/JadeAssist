/**
 * Environment configuration and validation
 *
 * Modes:
 *   auto (default on Railway) — starts safely when required vars are missing,
 *                             but enables full routes automatically once they
 *                             are present.
 *   false / strict          — fail fast when required vars are missing.
 *   true / minimal         — force minimal boot mode and disable feature routes.
 */
import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables
dotenv.config();

type MinimalModeSetting = 'auto' | 'true' | 'false';

function normaliseMinimalMode(value: string | undefined): MinimalModeSetting {
  const normalised = (value ?? 'auto').trim().toLowerCase();

  if (['1', 'true', 'yes', 'minimal'].includes(normalised)) return 'true';
  if (['0', 'false', 'no', 'strict'].includes(normalised)) return 'false';
  return 'auto';
}

function hasValue(value: string | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

const minimalModeSetting = normaliseMinimalMode(process.env['JADEASSIST_MINIMAL_MODE']);

const envSchema = z.object({
  // Server
  PORT: z.string().default('3001'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  API_URL: z.string().default('http://localhost:3001'),
  JADEASSIST_MINIMAL_MODE: z.string().optional(),

  // Database — MONGODB_URL is the primary env var. DATABASE_URL is accepted
  // as a legacy alias so existing Railway configs keep working without changes.
  MONGODB_URL: z.string().optional(),
  DATABASE_URL: z.string().optional(),

  // LLM
  OPENAI_API_KEY: z.string().optional(),
  LLM_MODEL: z.string().default('gpt-4-turbo'),
  LLM_TOKEN_LIMIT: z.string().default('4000'),

  // Auth
  JWT_SECRET: z.string().optional(),
  AUTH_PROVIDER: z.enum(['jwt', 'supabase', 'eventflow']).default('jwt'),

  // Event-flow integration
  EVENTFLOW_API_URL: z.string().optional(),
  EVENTFLOW_API_KEY: z.string().optional(),

  // EventFlow Catalog API (protected)
  EVENTFLOW_CATALOG_BASE_URL: z.string().optional(),
  EVENTFLOW_CATALOG_API_KEY: z.string().optional(),

  // Optional external discovery providers for supplier search fallback
  BRAVE_SEARCH_API_KEY: z.string().optional(),
  SERPAPI_API_KEY: z.string().optional(),
  GOOGLE_PLACES_API_KEY: z.string().optional(),

  // CORS — comma-separated list of allowed origins, '*' for all, or empty to
  // use the built-in production fallback.
  CORS_ORIGIN: z.string().default(''),

  // Logging
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsedEnv.error.format());
  process.exit(1);
}

// Resolve the DB URL: MONGODB_URL takes precedence over DATABASE_URL
const resolvedDbUrl = parsedEnv.data.MONGODB_URL ?? parsedEnv.data.DATABASE_URL;
const missingRequiredVars = [
  ...(!hasValue(resolvedDbUrl) ? ['MONGODB_URL'] : []),
  ...(!hasValue(parsedEnv.data.OPENAI_API_KEY) ? ['OPENAI_API_KEY'] : []),
  ...(!hasValue(parsedEnv.data.JWT_SECRET) ? ['JWT_SECRET'] : []),
];

const forcedMinimalMode = minimalModeSetting === 'true';
const strictMode = minimalModeSetting === 'false';
const autoMinimalMode = minimalModeSetting === 'auto' && missingRequiredVars.length > 0;
const minimalMode = forcedMinimalMode || autoMinimalMode;
const serviceConfigured = missingRequiredVars.length === 0;

if (strictMode && missingRequiredVars.length > 0) {
  console.error(`❌ Missing required environment variables: ${missingRequiredVars.join(', ')}`);
  console.error('   Set JADEASSIST_MINIMAL_MODE=auto for boot-safe Railway deploys during setup.');
  process.exit(1);
}

if (minimalMode) {
  console.warn(
    `⚠️  JADEASSIST_MINIMAL_MODE resolved to ${forcedMinimalMode ? 'forced minimal' : 'auto minimal'} mode.`
  );

  if (missingRequiredVars.length > 0) {
    console.warn(`⚠️  Missing vars: ${missingRequiredVars.join(', ')}`);
    console.warn('⚠️  Feature routes return 503 until the missing vars are configured.');
  } else {
    console.warn('⚠️  All required vars are present, but minimal mode is being forced.');
    console.warn('⚠️  Set JADEASSIST_MINIMAL_MODE=auto or false to enable feature routes.');
  }

  console.warn('⚠️  /healthz and / remain operational.');
}

export const env = {
  // Mode
  minimalMode,
  minimalModeSetting,
  serviceConfigured,
  missingRequiredVars,
  forcedMinimalMode,

  // Server
  port: parseInt(parsedEnv.data.PORT, 10),
  nodeEnv: parsedEnv.data.NODE_ENV,
  apiUrl: parsedEnv.data.API_URL,
  isDevelopment: parsedEnv.data.NODE_ENV === 'development',
  isProduction: parsedEnv.data.NODE_ENV === 'production',
  isTest: parsedEnv.data.NODE_ENV === 'test',

  // Database URL (MongoDB)
  databaseUrl: hasValue(resolvedDbUrl) ? resolvedDbUrl : undefined,

  // LLM
  llm: {
    apiKey: hasValue(parsedEnv.data.OPENAI_API_KEY) ? parsedEnv.data.OPENAI_API_KEY : undefined,
    model: parsedEnv.data.LLM_MODEL,
    tokenLimit: parseInt(parsedEnv.data.LLM_TOKEN_LIMIT, 10),
  },

  // Auth
  auth: {
    jwtSecret: hasValue(parsedEnv.data.JWT_SECRET) ? parsedEnv.data.JWT_SECRET : undefined,
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

  // External discovery providers
  searchProviders: {
    braveSearchApiKey: hasValue(parsedEnv.data.BRAVE_SEARCH_API_KEY)
      ? parsedEnv.data.BRAVE_SEARCH_API_KEY
      : undefined,
    serpApiKey: hasValue(parsedEnv.data.SERPAPI_API_KEY)
      ? parsedEnv.data.SERPAPI_API_KEY
      : undefined,
    googlePlacesApiKey: hasValue(parsedEnv.data.GOOGLE_PLACES_API_KEY)
      ? parsedEnv.data.GOOGLE_PLACES_API_KEY
      : undefined,
  },

  // CORS
  corsOrigin: parsedEnv.data.CORS_ORIGIN,

  // Logging
  logLevel: parsedEnv.data.LOG_LEVEL,
};
