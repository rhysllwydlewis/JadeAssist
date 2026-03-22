/**
 * Database error classification utilities.
 *
 * Used by route handlers to distinguish DB connectivity/initialisation errors
 * from LLM / application-level errors so they can be reported with an accurate
 * error code instead of the generic LLM_ERROR fallback.
 *
 * MongoDB (Mongoose) does not throw "missing relation" errors the way Postgres
 * does — collections are created automatically on first write.  Instead, the
 * relevant errors are network/connection failures that indicate the database
 * is not yet reachable.
 */

/** Mongoose / MongoDB error names that indicate the DB is not reachable. */
const MONGO_NOT_READY_NAMES = new Set([
  'MongoNetworkError',
  'MongoServerSelectionError',
  'MongoNotConnectedError',
  'MongoExpiredSessionError',
]);

/**
 * Returns true when the thrown value looks like a MongoDB connectivity or
 * initialisation error — i.e. the database is configured but not yet reachable
 * or the connection has not been established.
 */
export function isDbSchemaMissingError(err: unknown): boolean {
  if (err == null || typeof err !== 'object') return false;
  const name = (err as Record<string, unknown>)['name'];
  return typeof name === 'string' && MONGO_NOT_READY_NAMES.has(name);
}
