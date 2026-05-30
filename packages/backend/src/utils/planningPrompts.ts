/**
 * Pure prompt-building utilities for the planning engine.
 *
 * These functions have no side effects and no external dependencies,
 * making them easy to unit-test in isolation.
 */

import { EventType, EVENT_TYPE_METADATA } from '@jadeassist/shared';
import { LLM_SETTINGS } from '../utils/constants';

export interface PlanningContext {
  conversationId: string;
  userId: string;
  eventType?: EventType;
  budget?: number;
  guestCount?: number;
  eventDate?: Date;
  location?: string;
  planningStage?: string;
  contextCompleteness?: number;
}

export interface ExtractedPlanningContext {
  eventType?: EventType;
  budget?: number;
  guestCount?: number;
  eventDate?: Date;
  location?: string;
}

// Core details that must be gathered before full planning advice can be given
const CORE_DETAILS = ['eventType', 'eventDate', 'guestCount', 'budget', 'location'] as const;
type CoreDetail = (typeof CORE_DETAILS)[number];

const UK_LOCATION_ALIASES: Record<string, string> = {
  london: 'London',
  cardiff: 'Cardiff',
  swansea: 'Swansea',
  newport: 'Newport',
  wales: 'Wales',
  'south wales': 'South Wales',
  bristol: 'Bristol',
  birmingham: 'Birmingham',
  manchester: 'Manchester',
  liverpool: 'Liverpool',
  leeds: 'Leeds',
  sheffield: 'Sheffield',
  glasgow: 'Glasgow',
  edinburgh: 'Edinburgh',
  'south east': 'South East',
  'south west': 'South West',
  midlands: 'Midlands',
  'north west': 'North West',
  scotland: 'Scotland',
};

function compactWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function clampNumber(value: number, min: number, max: number): number | undefined {
  if (!Number.isFinite(value)) return undefined;
  return Math.min(Math.max(value, min), max);
}

function parseBudget(message: string): number | undefined {
  const lower = message.toLowerCase();
  const match = /(?:budget(?:\s*(?:is|of|around|about|approx(?:imately)?))?\s*)?[£$]?\s*(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)\s*(k|thousand|grand)?\b/i.exec(lower);
  if (!match) return undefined;

  const raw = Number(match[1].replace(/,/g, ''));
  const multiplier = match[2] ? 1000 : 1;
  const amount = raw * multiplier;

  // Avoid mistaking guest counts or dates for budgets.
  return clampNumber(amount, 100, 1_000_000);
}

function parseGuestCount(message: string): number | undefined {
  const match = /\b(\d{1,4})\s*(guests?|people|attendees?|pax|adults|children)\b/i.exec(message);
  if (match) {
    return clampNumber(Number(match[1]), 1, 10000);
  }

  if (/\b(intimate|small)\b/i.test(message)) return 30;
  if (/\b(large|big)\b/i.test(message)) return 150;
  return undefined;
}

function parseEventType(message: string): EventType | undefined {
  const lower = message.toLowerCase();

  if (/\b(wedding|marriage|civil partnership|bride|groom)\b/.test(lower)) return 'wedding';
  if (/\b(birthday|18th|21st|30th|40th|50th|60th)\b/.test(lower)) return 'birthday';
  if (/\b(corporate|work event|team away|away day|launch|networking)\b/.test(lower)) return 'corporate';
  if (/\b(conference|seminar|symposium|summit|expo)\b/.test(lower)) return 'conference';
  if (/\b(anniversary|vow renewal)\b/.test(lower)) return 'anniversary';
  if (/\b(party|celebration|private event)\b/.test(lower)) return 'party';

  return undefined;
}

function parseLocation(message: string): string | undefined {
  const lower = message.toLowerCase();

  for (const [needle, label] of Object.entries(UK_LOCATION_ALIASES)) {
    if (lower.includes(needle)) return label;
  }

  const explicit = /\b(?:in|near|around|at)\s+([A-Z][a-zA-Z\s'-]{2,40})(?:[,.!?]|$)/.exec(message);
  if (explicit) {
    return compactWhitespace(explicit[1]);
  }

  return undefined;
}

function parseEventDate(message: string): Date | undefined {
  const lower = message.toLowerCase();
  const now = new Date();

  if (/\b(next year)\b/.test(lower)) {
    return new Date(now.getFullYear() + 1, 5, 1);
  }

  if (/\b(this year)\b/.test(lower)) {
    return new Date(now.getFullYear(), 8, 1);
  }

  const isoLike = /\b(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\b/.exec(lower);
  if (isoLike) {
    const day = Number(isoLike[1]);
    const month = Number(isoLike[2]) - 1;
    const year = Number(isoLike[3].length === 2 ? `20${isoLike[3]}` : isoLike[3]);
    const date = new Date(year, month, day);
    if (!Number.isNaN(date.getTime())) return date;
  }

  const monthMatch = /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{4})\b/i.exec(message);
  if (monthMatch) {
    const monthIndex = [
      'january',
      'february',
      'march',
      'april',
      'may',
      'june',
      'july',
      'august',
      'september',
      'october',
      'november',
      'december',
    ].indexOf(monthMatch[1].toLowerCase());
    return new Date(Number(monthMatch[2]), monthIndex, 1);
  }

  return undefined;
}

export function extractPlanningContextFromMessage(message: string): ExtractedPlanningContext {
  return {
    eventType: parseEventType(message),
    budget: parseBudget(message),
    guestCount: parseGuestCount(message),
    eventDate: parseEventDate(message),
    location: parseLocation(message),
  };
}

export function mergePlanningContext(
  current: PlanningContext,
  extracted: ExtractedPlanningContext
): PlanningContext {
  return {
    ...current,
    eventType: current.eventType ?? extracted.eventType,
    budget: current.budget ?? extracted.budget,
    guestCount: current.guestCount ?? extracted.guestCount,
    eventDate: current.eventDate ?? extracted.eventDate,
    location: current.location ?? extracted.location,
  };
}

/**
 * Return human-readable labels for core details missing from the given context.
 */
export function getMissingDetails(context: PlanningContext): string[] {
  const missing: string[] = [];

  const checks: Record<CoreDetail, boolean> = {
    eventType: !!context.eventType,
    eventDate: !!context.eventDate,
    guestCount: !!context.guestCount,
    budget: !!context.budget,
    location: !!context.location,
  };

  const labels: Record<CoreDetail, string> = {
    eventType: 'event type',
    eventDate: 'date or timeframe',
    guestCount: 'guest count',
    budget: 'overall budget',
    location: 'location or region',
  };

  for (const detail of CORE_DETAILS) {
    if (!checks[detail]) {
      missing.push(labels[detail]);
    }
  }

  return missing;
}

export function getContextCompleteness(context: PlanningContext): number {
  const known = CORE_DETAILS.length - getMissingDetails(context).length;
  return Math.round((known / CORE_DETAILS.length) * 100);
}

export function getPlanningStage(context: PlanningContext): string {
  const completeness = getContextCompleteness(context);

  if (completeness === 0) return 'discovery';
  if (completeness < 60) return 'brief-building';
  if (completeness < 100) return 'scope-refinement';
  return 'action-planning';
}

export function getNextMissingDetail(context: PlanningContext): string | undefined {
  return getMissingDetails(context)[0];
}

/**
 * Build a dynamic system prompt that reflects what Jade already knows
 * and what she still needs to ask about.
 */
export function buildDynamicSystemPrompt(context: PlanningContext): string {
  const knownParts: string[] = [];
  const missingDetails = getMissingDetails(context);
  const nextMissingDetail = getNextMissingDetail(context);

  if (context.eventType) {
    const metadata = EVENT_TYPE_METADATA[context.eventType];
    knownParts.push(`Event type: ${metadata.displayName}`);
  }
  if (context.eventDate) {
    knownParts.push(`Event date/timeframe: ${context.eventDate.toDateString()}`);
  }
  if (context.guestCount) {
    knownParts.push(`Guest count: ${context.guestCount}`);
  }
  if (context.budget) {
    knownParts.push(`Budget: £${context.budget.toLocaleString()}`);
  }
  if (context.location) {
    knownParts.push(`Location: ${context.location}`);
  }

  const knownSection =
    knownParts.length > 0
      ? `\n\n## Known event brief\n${knownParts.map((p) => `- ${p}`).join('\n')}`
      : '\n\n## Known event brief\n- No firm event details captured yet.';

  const missingSection =
    missingDetails.length > 0
      ? `\n\n## Current conversation objective\nYou are still building the event brief. Ask only for the next missing detail: ${nextMissingDetail}. Do not ask for all missing details at once.`
      : '\n\n## Current conversation objective\nThe core brief is complete. Give confident, specific, actionable planning guidance rather than asking more basic discovery questions.';

  return `${LLM_SETTINGS.SYSTEM_PROMPT}${knownSection}${missingSection}\n\n## Response format\n- Keep the answer compact enough for a website widget.\n- Use short paragraphs and bullets.\n- End with one practical next step or one focused follow-up question.`;
}

/**
 * Build an enriched user message that appends context inline.
 */
export function buildEnrichedUserMessage(context: PlanningContext, userMessage: string): string {
  const contextParts: string[] = [];

  if (context.eventType) {
    const metadata = EVENT_TYPE_METADATA[context.eventType];
    contextParts.push(`Event Type: ${metadata.displayName}`);
  }
  if (context.budget) {
    contextParts.push(`Budget: £${context.budget.toLocaleString()}`);
  }
  if (context.guestCount) {
    contextParts.push(`Guest Count: ${context.guestCount}`);
  }
  if (context.eventDate) {
    contextParts.push(`Event Date/Timeframe: ${context.eventDate.toDateString()}`);
  }
  if (context.location) {
    contextParts.push(`Location: ${context.location}`);
  }

  if (contextParts.length === 0) {
    return userMessage;
  }

  return `${userMessage}\n\n[Known context: ${contextParts.join(' | ')}]`;
}

/**
 * Detect whether the response or context signals that more information is needed.
 */
export function detectInformationGaps(content: string, context: PlanningContext): boolean {
  const lowerContent = content.toLowerCase();

  const questionIndicators = [
    'what type',
    'what kind',
    'when is',
    'when are',
    'where is',
    'where are',
    'how many',
    'what is your budget',
    "what's your budget",
    'could you tell me',
    'can you share',
    'do you have a date',
    'do you have a venue',
  ];

  const hasQuestion = questionIndicators.some((indicator) => lowerContent.includes(indicator));
  const missingCoreDetails = getMissingDetails(context).length > 0;

  return hasQuestion || missingCoreDetails;
}

/**
 * Return context-aware quick-reply suggestions.
 */
export function extractContextualSuggestions(
  content: string,
  context: PlanningContext
): string[] | undefined {
  if (!context.eventType) {
    return ['Wedding', 'Birthday Party', 'Corporate Event', 'Anniversary', 'Other'];
  }

  if (!context.eventDate) {
    return ['This year', 'Next year', 'Spring 2027', 'Summer 2027', 'Not sure yet'];
  }

  if (!context.guestCount) {
    return ['Under 50 guests', '50–100 guests', '100–150 guests', '150+ guests'];
  }

  if (!context.budget) {
    return ['Under £5k', '£5k–£10k', '£10k–£20k', '£20k–£50k', '£50k+'];
  }

  if (!context.location) {
    return ['London', 'South Wales', 'South East', 'North West', 'Other'];
  }

  const lines = content.split('\n');
  const suggestions: string[] = [];

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (trimmed.match(/^[-*•]\s+/) || trimmed.match(/^\d+\.\s+/)) {
      const suggestion = trimmed.replace(/^[-*•]\s+/, '').replace(/^\d+\.\s+/, '');
      if (suggestion.length > 2 && suggestion.length < 46 && !suggestion.includes(':')) {
        suggestions.push(suggestion);
      }
    }
  });

  return suggestions.length > 0 ? Array.from(new Set(suggestions)).slice(0, 4) : undefined;
}
