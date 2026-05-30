import {
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

console.log(`\n──────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log(`──────────────────────────────────\n`);

if (failed > 0) {
  process.exit(1);
}
