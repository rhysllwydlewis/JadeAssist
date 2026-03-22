/**
 * Unit tests for the DB error classification utility (src/utils/dbErrors.ts).
 *
 * Run with:
 *   ts-node --project tsconfig.json src/tests/dbErrors.validation.ts
 */

import { isDbSchemaMissingError } from '../utils/dbErrors';

// ---------------------------------------------------------------------------
// Test runner helpers (same style as other validation tests)
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
// Tests
// ---------------------------------------------------------------------------

function runTests(): void {
  section('isDbSchemaMissingError — falsy / non-DB values');
  assert(!isDbSchemaMissingError(null), 'null → false');
  assert(!isDbSchemaMissingError(undefined), 'undefined → false');
  assert(!isDbSchemaMissingError('string error'), 'string → false');
  assert(!isDbSchemaMissingError(42), 'number → false');
  assert(!isDbSchemaMissingError(new Error('generic error')), 'plain Error → false');
  assert(!isDbSchemaMissingError({ name: undefined }), '{ name: undefined } → false');
  assert(!isDbSchemaMissingError({ name: 'SomeOtherError' }), 'unrelated error name → false');
  assert(!isDbSchemaMissingError({ name: '' }), 'empty name string → false');

  section('isDbSchemaMissingError — MongoDB connection errors → true');
  const networkErr = Object.assign(new Error('connection refused'), {
    name: 'MongoNetworkError',
  });
  assert(isDbSchemaMissingError(networkErr), 'Error with name MongoNetworkError → true');

  const selectionErr = Object.assign(new Error('server selection timeout'), {
    name: 'MongoServerSelectionError',
  });
  assert(isDbSchemaMissingError(selectionErr), 'Error with name MongoServerSelectionError → true');

  const notConnectedErr = Object.assign(new Error('not connected'), {
    name: 'MongoNotConnectedError',
  });
  assert(isDbSchemaMissingError(notConnectedErr), 'Error with name MongoNotConnectedError → true');

  const expiredErr = Object.assign(new Error('session expired'), {
    name: 'MongoExpiredSessionError',
  });
  assert(isDbSchemaMissingError(expiredErr), 'Error with name MongoExpiredSessionError → true');

  section('isDbSchemaMissingError — plain objects');
  assert(isDbSchemaMissingError({ name: 'MongoNetworkError' }), '{ name: MongoNetworkError } → true');
  assert(isDbSchemaMissingError({ name: 'MongoServerSelectionError' }), '{ name: MongoServerSelectionError } → true');

  // ── Results ───────────────────────────────────────────────────────────────
  console.log('\n──────────────────────────────────');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('──────────────────────────────────\n');

  if (failed > 0) process.exit(1);
}

runTests();
