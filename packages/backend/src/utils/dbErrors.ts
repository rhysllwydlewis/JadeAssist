/**
 * Database error classification utilities.
 *
 * Used by route handlers to distinguish DB schema / infrastructure errors from
 * LLM / application-level errors so they can be reported with an accurate
 * error code instead of the generic LLM_ERROR fallback.
 */

/** PostgreSQL SQLSTATE error codes that indicate missing schema objects. */
const PG_SCHEMA_MISSING_CODES = new Set([
  '42P01', // undefined_table  — relation does not exist
  '42703', // undefined_column — column does not exist
]);

/**
 * Returns true when the thrown value looks like a PostgreSQL "schema missing"
 * error (e.g. relation/table does not exist).  This typically means the DB
 * migrations / schema.sql have not been applied yet.
 */
export function isDbSchemaMissingError(err: unknown): boolean {
  if (err == null || typeof err !== 'object') return false;
  const code = (err as Record<string, unknown>)['code'];
  return typeof code === 'string' && PG_SCHEMA_MISSING_CODES.has(code);
}
