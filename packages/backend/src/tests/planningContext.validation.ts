import {
  extractPlanningContextFromMessage,
  getContextCompleteness,
  getMissingDetails,
  getPlanningStage,
  mergePlanningContext,
} from '../utils/planningPrompts';

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

section('Extracts event brief details from natural user messages');

const extracted = extractPlanningContextFromMessage(
  'We are planning a wedding in Cardiff next year for 120 guests with a budget of £25k.'
);

assert(extracted.eventType === 'wedding', 'detects wedding event type');
assert(extracted.location === 'Cardiff', 'detects Cardiff location');
assert(extracted.guestCount === 120, 'detects guest count');
assert(extracted.budget === 25000, 'detects shorthand budget');
assert(extracted.eventDate instanceof Date, 'detects broad date timeframe');

section('Avoids false positives');

const guestsOnly = extractPlanningContextFromMessage('We will probably have 120 guests in Cardiff.');

assert(guestsOnly.guestCount === 120, 'still extracts guest count without budget wording');
assert(guestsOnly.budget === undefined, 'does not treat guest count as a budget');
assert(guestsOnly.location === 'Cardiff', 'still extracts location without budget wording');

section('Merges context without overwriting known values');

const current = {
  conversationId: 'conversation-1',
  userId: 'anonymous',
  eventType: 'corporate' as const,
  budget: 10000,
};

const merged = mergePlanningContext(current, extracted);

assert(merged.eventType === 'corporate', 'keeps existing event type');
assert(merged.budget === 10000, 'keeps existing budget');
assert(merged.guestCount === 120, 'adds missing guest count');
assert(merged.location === 'Cardiff', 'adds missing location');

section('Scores planning completeness');

assert(getMissingDetails(merged).includes('date or timeframe') === false, 'date is no longer missing');
assert(getContextCompleteness(merged) >= 80, 'context completeness is high once key details are known');
assert(getPlanningStage(merged) === 'action-planning', 'moves to action-planning once complete');

console.log(`\n──────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log(`──────────────────────────────────\n`);

if (failed > 0) {
  process.exit(1);
}
