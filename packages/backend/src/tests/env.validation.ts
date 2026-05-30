/**
 * Smoke tests for env.ts validation and Railway-safe auto mode behaviour.
 *
 * Run with:
 *   ts-node --project tsconfig.json src/tests/env.validation.ts
 */

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

function parseEnv(vars: Record<string, string>): {
  minimalMode: boolean;
  minimalModeSetting: 'auto' | 'true' | 'false';
  serviceConfigured: boolean;
  missingRequiredVars: string[];
  forcedMinimalMode: boolean;
  port: number;
  databaseUrl: string | undefined;
  llm: { apiKey: string | undefined; model: string; tokenLimit: number };
  auth: { jwtSecret: string | undefined; provider: string };
} | null {
  const origEnv = process.env;
  const origExit = process.exit;

  let exitCalled = false;

  try {
    process.env = { ...vars };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (process as any).exit = () => {
      exitCalled = true;
      throw new Error('process.exit called');
    };

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

    const key = require.resolve('../config/env');
    delete require.cache[key];
  }
}

section('Auto mode — fully configured enables feature routes');

const autoFullResult = parseEnv({
  JADEASSIST_MINIMAL_MODE: 'auto',
  MONGODB_URL: 'mongodb://localhost:27017/jadeassist',
  OPENAI_API_KEY: 'sk-test-key',
  JWT_SECRET: 'super-secret-string-at-least-32-chars-long',
  PORT: '3001',
  NODE_ENV: 'test',
});

assert(autoFullResult !== null, 'does not call process.exit when all required vars are present in auto mode');
assert(autoFullResult?.minimalMode === false, 'minimalMode is false when auto mode is fully configured');
assert(autoFullResult?.minimalModeSetting === 'auto', 'minimalModeSetting is auto');
assert(autoFullResult?.serviceConfigured === true, 'serviceConfigured is true');
assert(autoFullResult?.missingRequiredVars.length === 0, 'missingRequiredVars is empty');
assert(autoFullResult?.llm.apiKey === 'sk-test-key', 'llm.apiKey is set');
assert(autoFullResult?.auth.jwtSecret === 'super-secret-string-at-least-32-chars-long', 'auth.jwtSecret is set');
assert(autoFullResult?.port === 3001, 'port is parsed as integer');

section('Auto mode — missing required vars enters minimal mode without exit');

const autoMissingResult = parseEnv({
  JADEASSIST_MINIMAL_MODE: 'auto',
  PORT: '3001',
  NODE_ENV: 'test',
});

assert(autoMissingResult !== null, 'does not call process.exit when vars are missing in auto mode');
assert(autoMissingResult?.minimalMode === true, 'minimalMode is true when auto mode is missing vars');
assert(autoMissingResult?.serviceConfigured === false, 'serviceConfigured is false');
assert(autoMissingResult?.missingRequiredVars.includes('MONGODB_URL') === true, 'missingRequiredVars includes MONGODB_URL');
assert(autoMissingResult?.missingRequiredVars.includes('OPENAI_API_KEY') === true, 'missingRequiredVars includes OPENAI_API_KEY');
assert(autoMissingResult?.missingRequiredVars.includes('JWT_SECRET') === true, 'missingRequiredVars includes JWT_SECRET');

section('Default mode — behaves like auto');

const defaultModeResult = parseEnv({
  MONGODB_URL: 'mongodb://localhost:27017/jadeassist',
  OPENAI_API_KEY: 'sk-test-key',
  JWT_SECRET: 'super-secret-string-at-least-32-chars-long',
  PORT: '3001',
  NODE_ENV: 'test',
});

assert(defaultModeResult !== null, 'default mode starts when fully configured');
assert(defaultModeResult?.minimalModeSetting === 'auto', 'unset JADEASSIST_MINIMAL_MODE normalises to auto');
assert(defaultModeResult?.minimalMode === false, 'default auto mode enables feature routes when configured');

section('Strict mode — all required vars present');

const strictResult = parseEnv({
  JADEASSIST_MINIMAL_MODE: 'false',
  MONGODB_URL: 'mongodb://localhost:27017/jadeassist',
  OPENAI_API_KEY: 'sk-test-key',
  JWT_SECRET: 'super-secret-string-at-least-32-chars-long',
  PORT: '3001',
  NODE_ENV: 'test',
});

assert(strictResult !== null, 'does not call process.exit when all required vars are present in strict mode');
assert(strictResult?.minimalMode === false, 'minimalMode is false in strict mode');
assert(strictResult?.minimalModeSetting === 'false', 'minimalModeSetting is false');
assert(strictResult?.serviceConfigured === true, 'serviceConfigured is true in strict mode');

section('Strict mode — missing required vars causes exit');

const strictMissingResult = parseEnv({
  JADEASSIST_MINIMAL_MODE: 'false',
  PORT: '3001',
  NODE_ENV: 'test',
});

assert(strictMissingResult === null, 'calls process.exit when required vars are missing in strict mode');

section('Forced minimal mode — starts without required vars');

const minimalResult = parseEnv({
  JADEASSIST_MINIMAL_MODE: 'true',
  PORT: '3001',
  NODE_ENV: 'test',
});

assert(minimalResult !== null, 'does not call process.exit in forced minimal mode without required vars');
assert(minimalResult?.minimalMode === true, 'minimalMode is true');
assert(minimalResult?.forcedMinimalMode === true, 'forcedMinimalMode is true');
assert(minimalResult?.serviceConfigured === false, 'serviceConfigured is false when vars are missing');

section('Forced minimal mode — all vars provided still keeps feature routes off');

const minimalFullResult = parseEnv({
  JADEASSIST_MINIMAL_MODE: 'true',
  MONGODB_URL: 'mongodb://localhost:27017/jadeassist',
  OPENAI_API_KEY: 'sk-test-key',
  JWT_SECRET: 'super-secret-string-at-least-32-chars-long',
  PORT: '3001',
  NODE_ENV: 'test',
});

assert(minimalFullResult !== null, 'starts successfully when all vars are present in forced minimal mode');
assert(minimalFullResult?.minimalMode === true, 'forced minimal mode remains true');
assert(minimalFullResult?.serviceConfigured === true, 'serviceConfigured is true even though feature routes are forced off');
assert(minimalFullResult?.missingRequiredVars.length === 0, 'missingRequiredVars is empty when all vars are present');

console.log(`\n──────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log(`──────────────────────────────────\n`);

if (failed > 0) {
  process.exit(1);
}
