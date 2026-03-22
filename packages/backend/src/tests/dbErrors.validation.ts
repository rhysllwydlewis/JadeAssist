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
  assert(!isDbSchemaMissingError({ code: undefined }), '{ code: undefined } → false');
  assert(!isDbSchemaMissingError({ code: '23505' }), 'unrelated PG code 23505 → false');
  assert(!isDbSchemaMissingError({ code: '' }), 'empty code string → false');

  section('isDbSchemaMissingError — 42P01 (undefined_table)');
  // Simulates: Error thrown by pg when a table doesn't exist
  const pgErr42P01 = Object.assign(new Error('relation "messages" does not exist'), {
    code: '42P01',
  });
  assert(isDbSchemaMissingError(pgErr42P01), 'Error with code 42P01 → true');
  assert(isDbSchemaMissingError({ code: '42P01' }), 'plain object { code: "42P01" } → true');

  section('isDbSchemaMissingError — 42703 (undefined_column)');
  const pgErr42703 = Object.assign(new Error('column "foo" does not exist'), { code: '42703' });
  assert(isDbSchemaMissingError(pgErr42703), 'Error with code 42703 → true');
  assert(isDbSchemaMissingError({ code: '42703' }), 'plain object { code: "42703" } → true');

  // ── Results ───────────────────────────────────────────────────────────────
  console.log('\n──────────────────────────────────');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('──────────────────────────────────\n');

  if (failed > 0) process.exit(1);
}

runTests();
