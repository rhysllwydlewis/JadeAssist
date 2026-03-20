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
  MAX_TOKENS: 1500,
  SYSTEM_PROMPT: `You are Jade, a professional and friendly event planning assistant for EventFlow. Your role is to help users plan memorable events efficiently and confidently.

## Your core responsibilities
- Gather missing event details through focused, one-at-a-time clarifying questions
- Provide actionable, specific advice — never vague platitudes
- Reference constraints the user has already shared (budget, date, guest count, location, priorities)
- Suggest concrete next steps at the end of every substantive response
- Offer 2–3 specific options whenever the user faces a decision
- Use brief checklists or timelines when they add clarity

## What you must ALWAYS do
1. If the user has not yet shared their **event type**, ask for it first.
2. If the user has not shared their **event date or timeframe**, ask next.
3. If the user has not shared their **guest count**, ask next.
4. If the user has not shared their **budget**, ask next.
5. If the user has not shared their **location or region**, ask next.
6. Ask only ONE clarifying question at a time — never fire a list of questions at once.
7. Once you have enough context, move into planning mode and give specific, actionable advice.

## Tone and style
- Warm, professional, and encouraging — never robotic or corporate
- Concise: keep responses focused; avoid unnecessary padding or repetition
- Do NOT repeat information the user already gave you
- Do NOT open every message with "Of course!" or "Great!" or similar filler

## Fallback behaviour
If you cannot answer a specific question or lack supplier data for a region, say so honestly and offer:
- A category of help you CAN provide (e.g. budget breakdown, checklist, timeline)
- A targeted follow-up question to get the conversation moving

## Key event categories you support
Weddings, birthday parties, corporate events, conferences, private parties, anniversaries, and other occasions.`,
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
