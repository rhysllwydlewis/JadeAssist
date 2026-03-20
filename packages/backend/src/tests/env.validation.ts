/**
 * Smoke tests for env.ts dual-mode validation behaviour.
 *
 * Run with:
 *   ts-node --project tsconfig.json src/tests/env.validation.ts
 *
 * These tests exercise the parsing logic directly by manipulating
 * process.env and re-requiring the module.  No database or LLM is needed.
 */

// ---------------------------------------------------------------------------
// Test runner helpers (same style as planningEngine.validation.ts)
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
// Helpers
// ---------------------------------------------------------------------------

/**
 * Parses the env module in an isolated context with a custom process.env.
 * Returns the exported `env` object, or null if the module called process.exit.
 */
function parseEnv(vars: Record<string, string>): {
  minimalMode: boolean;
  port: number;
  databaseUrl: string | undefined;
  llm: { apiKey: string | undefined; model: string; tokenLimit: number };
  auth: { jwtSecret: string | undefined; provider: string };
} | null {
  // Save and restore process.env + process.exit to isolate test runs
  const origEnv = process.env;
  const origExit = process.exit;

  let exitCalled = false;

  try {
    // Replace process.env with our test vars
    process.env = { ...vars };

    // Stub process.exit so the module cannot terminate the test runner
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (process as any).exit = () => {
      exitCalled = true;
      throw new Error('process.exit called');
    };

    // Clear Node module cache so env.ts is re-evaluated
    const key = require.resolve('../config/env');
    delete require.cache[key];

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('../config/env') as { env: typeof import('../config/env').env };
    return mod.env;
  } catch (_e) {
    if (exitCalled) return null;
    throw _e;
  } finally {
    process.env = origEnv;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (process as any).exit = origExit;

    // Clean up the cached module so subsequent calls re-evaluate
    const key = require.resolve('../config/env');
    delete require.cache[key];
  }
}

// ---------------------------------------------------------------------------
// Tests — strict mode (default)
// ---------------------------------------------------------------------------

section('Strict mode — all required vars present');

const strictResult = parseEnv({
  DATABASE_URL: 'postgresql://localhost/test',
  OPENAI_API_KEY: 'sk-test-key',
  JWT_SECRET: 'super-secret-string-at-least-32-chars-long',
  PORT: '3001',
  NODE_ENV: 'test',
});

assert(strictResult !== null, 'does not call process.exit when all required vars are present');
assert(strictResult?.minimalMode === false, 'minimalMode is false');
assert(strictResult?.databaseUrl === 'postgresql://localhost/test', 'databaseUrl is set');
assert(strictResult?.llm.apiKey === 'sk-test-key', 'llm.apiKey is set');
assert(strictResult?.auth.jwtSecret === 'super-secret-string-at-least-32-chars-long', 'auth.jwtSecret is set');
assert(strictResult?.port === 3001, 'port is parsed as integer');
assert(strictResult?.llm.model === 'gpt-4-turbo', 'llm.model defaults to gpt-4-turbo');
assert(strictResult?.llm.tokenLimit === 4000, 'llm.tokenLimit defaults to 4000');

section('Strict mode — missing required vars causes exit');

const strictMissingResult = parseEnv({
  // DATABASE_URL, OPENAI_API_KEY, JWT_SECRET intentionally absent
  PORT: '3001',
  NODE_ENV: 'test',
});

assert(strictMissingResult === null, 'calls process.exit when required vars are missing in strict mode');

// ---------------------------------------------------------------------------
// Tests — minimal mode
// ---------------------------------------------------------------------------

section('Minimal mode — starts without required vars');

const minimalResult = parseEnv({
  JADEASSIST_MINIMAL_MODE: 'true',
  PORT: '3001',
  NODE_ENV: 'test',
  // DATABASE_URL, OPENAI_API_KEY, JWT_SECRET intentionally absent
});

assert(minimalResult !== null, 'does not call process.exit in minimal mode without required vars');
assert(minimalResult?.minimalMode === true, 'minimalMode is true');
assert(minimalResult?.databaseUrl === undefined, 'databaseUrl is undefined');
assert(minimalResult?.llm.apiKey === undefined, 'llm.apiKey is undefined');
assert(minimalResult?.auth.jwtSecret === undefined, 'auth.jwtSecret is undefined');

section('Minimal mode — partial configuration (only DATABASE_URL)');

const minimalPartialResult = parseEnv({
  JADEASSIST_MINIMAL_MODE: 'true',
  DATABASE_URL: 'postgresql://localhost/test',
  PORT: '3001',
  NODE_ENV: 'test',
});

assert(minimalPartialResult !== null, 'does not call process.exit with partial config in minimal mode');
assert(minimalPartialResult?.databaseUrl === 'postgresql://localhost/test', 'databaseUrl is set when provided');
assert(minimalPartialResult?.llm.apiKey === undefined, 'llm.apiKey still undefined');

section('Minimal mode — all vars provided (fully configured)');

const minimalFullResult = parseEnv({
  JADEASSIST_MINIMAL_MODE: 'true',
  DATABASE_URL: 'postgresql://localhost/test',
  OPENAI_API_KEY: 'sk-test-key',
  JWT_SECRET: 'super-secret-string-at-least-32-chars-long',
  PORT: '3001',
  NODE_ENV: 'test',
});

assert(minimalFullResult !== null, 'starts successfully when all vars are present in minimal mode');
assert(minimalFullResult?.minimalMode === true, 'minimalMode flag is still true');
assert(minimalFullResult?.databaseUrl === 'postgresql://localhost/test', 'databaseUrl is set');
assert(minimalFullResult?.llm.apiKey === 'sk-test-key', 'llm.apiKey is set');

// ---------------------------------------------------------------------------
// Results
// ---------------------------------------------------------------------------

console.log(`\n──────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log(`──────────────────────────────────\n`);

if (failed > 0) {
  process.exit(1);
}
