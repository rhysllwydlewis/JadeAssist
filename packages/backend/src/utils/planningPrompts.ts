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
}

// Core details that must be gathered before full planning advice can be given
const CORE_DETAILS = ['eventType', 'eventDate', 'guestCount', 'budget', 'location'] as const;
type CoreDetail = (typeof CORE_DETAILS)[number];

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
    eventType: 'Event type (wedding, birthday, corporate, etc.)',
    eventDate: 'Event date or timeframe',
    guestCount: 'Number of guests',
    budget: 'Overall budget',
    location: 'Location or region',
  };

  for (const detail of CORE_DETAILS) {
    if (!checks[detail]) {
      missing.push(labels[detail]);
    }
  }

  return missing;
}

/**
 * Build a dynamic system prompt that reflects what Jade already knows
 * and what she still needs to ask about.
 */
export function buildDynamicSystemPrompt(context: PlanningContext): string {
  const knownParts: string[] = [];
  const missingDetails = getMissingDetails(context);

  if (context.eventType) {
    const metadata = EVENT_TYPE_METADATA[context.eventType];
    knownParts.push(`Event type: ${metadata.displayName}`);
  }
  if (context.eventDate) {
    knownParts.push(`Event date: ${context.eventDate.toDateString()}`);
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
      ? `\n\n## What you already know about this event\n${knownParts.map((p) => `- ${p}`).join('\n')}`
      : '';

  const missingSection =
    missingDetails.length > 0
      ? `\n\n## Key details still needed (ask the FIRST missing one if relevant)\n${missingDetails.map((d) => `- ${d}`).join('\n')}`
      : '\n\n## You now have all core details — focus on actionable planning advice.';

  return `${LLM_SETTINGS.SYSTEM_PROMPT}${knownSection}${missingSection}`;
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
    contextParts.push(`Budget: £${context.budget}`);
  }
  if (context.guestCount) {
    contextParts.push(`Guest Count: ${context.guestCount}`);
  }
  if (context.eventDate) {
    contextParts.push(`Event Date: ${context.eventDate.toDateString()}`);
  }
  if (context.location) {
    contextParts.push(`Location: ${context.location}`);
  }

  if (contextParts.length === 0) {
    return userMessage;
  }

  return `${userMessage}\n\n[Context: ${contextParts.join(' | ')}]`;
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

  if (!context.budget) {
    return ['Under £5k', '£5k–£10k', '£10k–£20k', '£20k–£50k', '£50k+'];
  }

  if (!context.location) {
    return ['London', 'South East', 'North West', 'Scotland', 'Other'];
  }

  // Extract from bulleted content in the response
  const lines = content.split('\n');
  const suggestions: string[] = [];

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (trimmed.match(/^[-*•]\s+/) || trimmed.match(/^\d+\.\s+/)) {
      const suggestion = trimmed.replace(/^[-*•]\s+/, '').replace(/^\d+\.\s+/, '');
      if (suggestion.length > 0 && suggestion.length < 60) {
        suggestions.push(suggestion);
      }
    }
  });

  return suggestions.length > 0 ? suggestions.slice(0, 5) : undefined;
}
