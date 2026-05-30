import {
  buildLocalPlanningGuide,
  isOpenAIInsufficientQuotaError,
  isOpenAIRateLimitError,
} from '../services/llmService';

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

section('OpenAI insufficient quota classification');

const insufficientQuotaError = {
  status: 429,
  error: {
    message: 'You exceeded your current quota, please check your plan and billing details.',
    type: 'insufficient_quota',
    code: 'insufficient_quota',
  },
};

assert(
  isOpenAIInsufficientQuotaError(insufficientQuotaError) === true,
  'detects insufficient_quota provider errors'
);
assert(
  isOpenAIRateLimitError(insufficientQuotaError) === false,
  'does not misclassify insufficient_quota as a traffic rate limit'
);

section('OpenAI rate limit classification');

const rateLimitError = {
  status: 429,
  error: {
    message: 'Rate limit reached for requests.',
    type: 'rate_limit_error',
    code: 'rate_limit_exceeded',
  },
};

assert(
  isOpenAIRateLimitError(rateLimitError) === true,
  'detects ordinary rate limit errors'
);
assert(
  isOpenAIInsufficientQuotaError(rateLimitError) === false,
  'does not misclassify ordinary rate limits as insufficient quota'
);

section('Local planning fallback');

const fallback = buildLocalPlanningGuide([
  {
    role: 'user',
    content:
      'Can you help with the budget?\n\n[Known context: Event Type: Wedding | Budget: £25,000 | Guest Count: 120 | Location: Cardiff]',
  },
]);

assert(fallback.includes('built-in planning guide'), 'returns a clear local fallback message');
assert(fallback.includes('Wedding') || fallback.includes('wedding'), 'uses known event context');
assert(fallback.includes('£25,000'), 'uses known budget context');
assert(fallback.includes('Venue'), 'gives practical budget guidance');

console.log(`\n──────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log(`──────────────────────────────────\n`);

if (failed > 0) {
  process.exit(1);
}
