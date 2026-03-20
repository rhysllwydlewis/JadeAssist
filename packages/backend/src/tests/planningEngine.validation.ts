/**
 * Validation script for planning engine behaviours.
 *
 * Run with: ts-node --project tsconfig.json src/tests/planningEngine.validation.ts
 *
 * Tests pure utility functions (no database or LLM required).
 */

import { LLM_SETTINGS } from '../utils/constants';
import {
  getMissingDetails,
  buildDynamicSystemPrompt,
  buildEnrichedUserMessage,
  detectInformationGaps,
  extractContextualSuggestions,
  PlanningContext,
} from '../utils/planningPrompts';

// ---------------------------------------------------------------------------
// Test runner helpers
// ---------------------------------------------------------------------------

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string): void {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${label}`);
    failed++;
  }
}

function section(title: string): void {
  console.log(`\n── ${title} ──`);
}

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const emptyContext: PlanningContext = { conversationId: 'x', userId: 'y' };

const fullContext: PlanningContext = {
  conversationId: 'test-conv',
  userId: 'test-user',
  eventType: 'wedding',
  budget: 15000,
  guestCount: 80,
  eventDate: new Date('2026-06-15'),
  location: 'London',
};

// ---------------------------------------------------------------------------
// 1. System prompt quality checks
// ---------------------------------------------------------------------------

section('System prompt quality');

const prompt = LLM_SETTINGS.SYSTEM_PROMPT;

assert(prompt.length > 500, 'System prompt is substantive (>500 chars)');
assert(
  prompt.toLowerCase().includes('one clarifying') || prompt.toLowerCase().includes('one at a time'),
  'System prompt instructs asking one clarifying question at a time'
);
assert(
  prompt.toLowerCase().includes('event type'),
  'System prompt mentions event type as a required detail'
);
assert(prompt.toLowerCase().includes('budget'), 'System prompt mentions budget');
assert(prompt.toLowerCase().includes('guest'), 'System prompt mentions guest count');
assert(
  prompt.toLowerCase().includes('actionable') || prompt.toLowerCase().includes('next steps'),
  'System prompt instructs actionable responses'
);
assert(
  prompt.toLowerCase().includes('do not') || prompt.toLowerCase().includes("don't"),
  'System prompt instructs Jade NOT to use filler openers'
);
assert(
  prompt.toLowerCase().includes('fallback') || prompt.toLowerCase().includes('cannot answer'),
  'System prompt defines fallback behaviour'
);

// ---------------------------------------------------------------------------
// 2. getMissingDetails
// ---------------------------------------------------------------------------

section('getMissingDetails');

const allMissing = getMissingDetails(emptyContext);
assert(allMissing.length === 5, 'Empty context: all 5 core details are flagged as missing');
assert(
  allMissing.some((d) => d.toLowerCase().includes('event type')),
  'Missing list includes event type'
);
assert(
  allMissing.some((d) => d.toLowerCase().includes('budget')),
  'Missing list includes budget'
);
assert(
  allMissing.some((d) => d.toLowerCase().includes('guest')),
  'Missing list includes guest count'
);
assert(
  allMissing.some((d) => d.toLowerCase().includes('location')),
  'Missing list includes location'
);

const nothingMissing = getMissingDetails(fullContext);
assert(nothingMissing.length === 0, 'Full context: nothing flagged as missing');

const partialContext: PlanningContext = {
  conversationId: 'p',
  userId: 'u',
  eventType: 'birthday',
};
const partialMissing = getMissingDetails(partialContext);
assert(partialMissing.length === 4, 'Partial context (event type only): 4 details still missing');

// ---------------------------------------------------------------------------
// 3. buildDynamicSystemPrompt — known context reflected
// ---------------------------------------------------------------------------

section('buildDynamicSystemPrompt');

const fullPrompt = buildDynamicSystemPrompt(fullContext);
assert(fullPrompt.includes('Wedding'), 'Full context: event type "Wedding" is reflected');
assert(
  fullPrompt.includes('£15,000') || fullPrompt.includes('15000'),
  'Full context: budget is reflected'
);
assert(fullPrompt.includes('80'), 'Full context: guest count is reflected');
assert(fullPrompt.includes('London'), 'Full context: location is reflected');
assert(
  fullPrompt.includes('all core details'),
  'Full context: prompt notes all core details are present'
);

const partialPrompt = buildDynamicSystemPrompt(partialContext);
assert(partialPrompt.includes('Birthday'), 'Partial context: event type shown');
assert(
  partialPrompt.includes('still needed'),
  'Partial context: missing details section present'
);
assert(
  partialPrompt.toLowerCase().includes('budget'),
  'Partial context: budget flagged as missing'
);

// ---------------------------------------------------------------------------
// 4. buildEnrichedUserMessage
// ---------------------------------------------------------------------------

section('buildEnrichedUserMessage');

const noContextMsg = buildEnrichedUserMessage(emptyContext, 'Hello');
assert(noContextMsg === 'Hello', 'Empty context: message unchanged');

const enrichedMsg = buildEnrichedUserMessage(fullContext, 'What venues do you recommend?');
assert(enrichedMsg.includes('What venues do you recommend?'), 'Enriched: original message preserved');
assert(enrichedMsg.includes('Wedding'), 'Enriched: event type appended');
assert(enrichedMsg.includes('London'), 'Enriched: location appended');
assert(enrichedMsg.includes('£15000') || enrichedMsg.includes('15000'), 'Enriched: budget appended');
assert(enrichedMsg.includes('[Context:'), 'Enriched: context block present');

// ---------------------------------------------------------------------------
// 5. detectInformationGaps
// ---------------------------------------------------------------------------

section('detectInformationGaps');

assert(
  detectInformationGaps('Hello!', emptyContext) === true,
  'Empty context: gaps detected regardless of content'
);
assert(
  detectInformationGaps('Here is your venue list.', fullContext) === false,
  'Full context with no question words: no gaps detected'
);
assert(
  detectInformationGaps('What type of event are you planning?', fullContext) === true,
  'Question phrase in response: gaps detected even with full context'
);
assert(
  detectInformationGaps('How many guests are you expecting?', partialContext) === true,
  'Question phrase + missing details: gaps detected'
);

// ---------------------------------------------------------------------------
// 6. extractContextualSuggestions — context-aware quick replies
// ---------------------------------------------------------------------------

section('extractContextualSuggestions');

const noTypeSuggestions = extractContextualSuggestions('', emptyContext);
assert(
  Array.isArray(noTypeSuggestions) && noTypeSuggestions.length > 0,
  'No event type: returns event-type options'
);
assert(
  noTypeSuggestions?.some((s) => s.toLowerCase().includes('wedding')) === true,
  'No event type: includes "Wedding" option'
);

const budgetSuggestions = extractContextualSuggestions('', partialContext);
assert(
  Array.isArray(budgetSuggestions) && budgetSuggestions.some((s) => s.includes('£')),
  'Event type known but no budget: returns budget range options'
);

const typeAndBudgetCtx: PlanningContext = {
  conversationId: 'x',
  userId: 'y',
  eventType: 'wedding',
  budget: 20000,
};
const locationSuggestions = extractContextualSuggestions('', typeAndBudgetCtx);
assert(
  Array.isArray(locationSuggestions) &&
    locationSuggestions.some(
      (s) => s.toLowerCase().includes('london') || s.toLowerCase().includes('scotland')
    ),
  'Event type + budget known but no location: returns location options'
);

// With full context, should extract from bulleted content in the response
const bulletContent =
  '- Book venue\n- Send invitations\n- Confirm caterers\n- Arrange flowers\n- Plan music';
const extractedSuggestions = extractContextualSuggestions(bulletContent, fullContext);
assert(
  Array.isArray(extractedSuggestions) && extractedSuggestions.length > 0,
  'Full context: extracts suggestions from bulleted response'
);
assert(
  extractedSuggestions?.some((s) => s.toLowerCase().includes('venue')) === true,
  'Full context: "Book venue" extracted as suggestion'
);

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

console.log(`\n──────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log(`──────────────────────────────────\n`);

if (failed > 0) {
  process.exit(1);
}

