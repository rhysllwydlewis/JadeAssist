/**
 * Application constants
 */

// API response messages
export const API_MESSAGES = {
  HEALTH_CHECK_SUCCESS: 'JadeAssist API is healthy',
  UNAUTHORIZED: 'Unauthorized access',
  FORBIDDEN: 'Access forbidden',
  NOT_FOUND: 'Resource not found',
  VALIDATION_ERROR: 'Validation error',
  INTERNAL_ERROR: 'Internal server error',
  RATE_LIMIT_EXCEEDED: 'Rate limit exceeded',
} as const;

// API error codes
export const ERROR_CODES = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  DATABASE_ERROR: 'DATABASE_ERROR',
  LLM_ERROR: 'LLM_ERROR',
} as const;

// Rate limiting
export const RATE_LIMITS = {
  CHAT: {
    windowMs: 60 * 1000, // 1 minute
    max: 20, // 20 requests per minute
  },
  PLANNING: {
    windowMs: 60 * 1000,
    max: 10,
  },
  DEFAULT: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
  },
} as const;

// LLM settings
export const LLM_SETTINGS = {
  TEMPERATURE: 0.7,
  MAX_TOKENS: 1000,
  SYSTEM_PROMPT: `You are Jade, an expert event planning assistant. You help users plan events by:
- Understanding their requirements and preferences
- Providing detailed planning advice and timelines
- Recommending suppliers based on location and budget
- Creating comprehensive checklists and schedules
- Calculating budgets and costs

Be friendly, professional, and thorough in your responses.`,
} as const;

// Budget allocation defaults (percentages)
export const DEFAULT_BUDGET_ALLOCATIONS = {
  wedding: {
    venue: 30,
    catering: 25,
    photographer: 10,
    entertainment: 8,
    florist: 8,
    decorator: 6,
    stationery: 3,
    transport: 3,
    other: 7,
  },
  birthday: {
    venue: 25,
    catering: 35,
    entertainment: 20,
    decorator: 10,
    other: 10,
  },
  corporate: {
    venue: 35,
    catering: 30,
    equipment: 15,
    entertainment: 10,
    other: 10,
  },
  conference: {
    venue: 40,
    catering: 25,
    equipment: 20,
    accommodation: 10,
    other: 5,
  },
  party: {
    venue: 30,
    catering: 40,
    entertainment: 20,
    other: 10,
  },
  anniversary: {
    venue: 30,
    catering: 30,
    photographer: 15,
    florist: 10,
    entertainment: 10,
    other: 5,
  },
  other: {
    venue: 30,
    catering: 30,
    entertainment: 15,
    other: 25,
  },
} as const;
