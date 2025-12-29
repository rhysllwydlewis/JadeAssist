/**
 * Environment configuration and validation
 */
import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables
dotenv.config();

// Environment schema validation
const envSchema = z.object({
  // Server
  PORT: z.string().default('3001'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  API_URL: z.string().default('http://localhost:3001'),

  // Database
  DATABASE_URL: z.string(),
  SUPABASE_URL: z.string().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),

  // LLM
  OPENAI_API_KEY: z.string(),
  LLM_MODEL: z.string().default('gpt-4-turbo'),
  LLM_TOKEN_LIMIT: z.string().default('4000'),

  // Auth
  JWT_SECRET: z.string(),
  AUTH_PROVIDER: z.enum(['jwt', 'supabase', 'eventflow']).default('jwt'),

  // Event-flow integration
  EVENTFLOW_API_URL: z.string().optional(),
  EVENTFLOW_API_KEY: z.string().optional(),

  // Logging
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

// Parse and validate environment
const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsedEnv.error.format());
  process.exit(1);
}

export const env = {
  // Server
  port: parseInt(parsedEnv.data.PORT, 10),
  nodeEnv: parsedEnv.data.NODE_ENV,
  apiUrl: parsedEnv.data.API_URL,
  isDevelopment: parsedEnv.data.NODE_ENV === 'development',
  isProduction: parsedEnv.data.NODE_ENV === 'production',
  isTest: parsedEnv.data.NODE_ENV === 'test',

  // Database
  databaseUrl: parsedEnv.data.DATABASE_URL,
  supabase: {
    url: parsedEnv.data.SUPABASE_URL,
    anonKey: parsedEnv.data.SUPABASE_ANON_KEY,
  },

  // LLM
  llm: {
    apiKey: parsedEnv.data.OPENAI_API_KEY,
    model: parsedEnv.data.LLM_MODEL,
    tokenLimit: parseInt(parsedEnv.data.LLM_TOKEN_LIMIT, 10),
  },

  // Auth
  auth: {
    jwtSecret: parsedEnv.data.JWT_SECRET,
    provider: parsedEnv.data.AUTH_PROVIDER,
  },

  // Event-flow integration
  eventflow: {
    apiUrl: parsedEnv.data.EVENTFLOW_API_URL,
    apiKey: parsedEnv.data.EVENTFLOW_API_KEY,
  },

  // Logging
  logLevel: parsedEnv.data.LOG_LEVEL,
};
