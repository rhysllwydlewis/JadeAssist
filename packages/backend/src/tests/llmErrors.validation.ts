import {
  buildLocalPlanningGuide,
  callProviderWithBackoff,
  isOpenAIInsufficientQuotaError,
  isOpenAIRateLimitError,
  parseBudgetRange,
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

assert(isOpenAIRateLimitError(rateLimitError) === true, 'detects ordinary rate limit errors');
assert(
  isOpenAIInsufficientQuotaError(rateLimitError) === false,
  'does not misclassify ordinary rate limits as insufficient quota'
);

section('Budget range parsing');

assert(
  parseBudgetRange('£5k-£10k')?.label === '£5,000–£10,000',
  'preserves £5k-£10k as a range'
);
assert(parseBudgetRange('5-10k')?.label === '£5,000–£10,000', 'preserves 5-10k as a range');
assert(parseBudgetRange('under £8k')?.label === 'under £8,000', 'parses under budget limits');
assert(parseBudgetRange('around £6k')?.label === '£5,400–£6,600', 'parses around budget ranges');

section('Transparent degraded planning fallback');

const fallback = buildLocalPlanningGuide([
  {
    role: 'user',
    content:
      'Can you help with the budget?\n\n[Known context: Event Type: Wedding | Budget: £25,000 | Guest Count: 120 | Location: Cardiff]',
  },
]);

assert(fallback.includes('degraded planning mode'), 'returns transparent degraded-mode message');
assert(fallback.includes('wedding'), 'uses known event context');
assert(fallback.includes('£25,000'), 'uses known budget context');
assert(fallback.includes('Venue'), 'gives practical budget guidance');

const rangeFallback = buildLocalPlanningGuide([
  {
    role: 'user',
    content:
      '£5k–£10k\n\n[Known context: Event Type: Wedding | Guest Count: 50 | Location: South Wales]',
  },
]);

assert(rangeFallback.includes('£5,000–£10,000'), 'preserves budget ranges in fallback output');
assert(rangeFallback.includes('50'), 'uses known guest count context');
assert(rangeFallback.includes('South Wales'), 'uses known location context');

const fragmentFallback = buildLocalPlanningGuide([
  {
    role: 'user',
    content: 'i have\n\n[Known context: Event Type: Wedding | Budget: £5k–£10k | Location: South Wales]',
  },
]);

assert(fragmentFallback.includes('do not want to guess'), 'asks a clarification question for fragments');
assert(
  !fragmentFallback.includes('use this practical starting split'),
  'does not repeat a generic budget block for fragments'
);

const contextNoiseFallback = buildLocalPlanningGuide([
  {
    role: 'user',
    content:
      'Wedding\n\n[Known context: Budget: £5k–£10k | Guest Count: 50 | Location: South Wales]',
  },
]);

assert(
  !contextNoiseFallback.includes('A practical split is'),
  'does not classify appended known context as the actual user question'
);

const recommendationFallback = buildLocalPlanningGuide([
  {
    role: 'user',
    content:
      'Find me a florist in Bolton\n\n[Known context: Location: Bolton]\n\n[Relevant EventFlow search results]\n1. Google Maps: florists in Bolton (Bolton) — florist: Live map results [https://www.google.com/maps/search/?api=1&query=event%20florists%20in%20Bolton] Source: online-search\n2. Add to Event: florists in Bolton (Bolton) — florist: UK event supplier marketplace [https://www.google.com/search?q=site%3Aaddtoevent.co.uk%20event%20florists%20in%20Bolton] Source: online-search',
  },
]);

assert(
  recommendationFallback.includes('Google Maps: florists in Bolton'),
  'local fallback uses supplied search recommendations'
);
assert(
  recommendationFallback.includes('Add to Event: florists in Bolton'),
  'local fallback includes multiple shortlist options'
);
assert(
  recommendationFallback.includes('capacity'),
  'local recommendation fallback gives verification next steps'
);

section('Provider retry helper');

async function validateRetryHelper(): Promise<void> {
  let attempts = 0;
  await callProviderWithBackoff(
    async () => {
      attempts++;
      if (attempts < 2) throw { status: 503, message: 'temporary upstream failure' };
      return 'ok';
    },
    2,
    1
  );
  assert(attempts === 2, 'retries retryable provider failures with backoff');
}

validateRetryHelper()
  .then(() => {
    console.log(`\n──────────────────────────────────`);
    console.log(`Results: ${passed} passed, ${failed} failed`);
    console.log(`──────────────────────────────────\n`);
    if (failed > 0) process.exit(1);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
