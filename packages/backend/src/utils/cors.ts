/**
 * CORS origin resolution utilities.
 *
 * Centralised here so both the Express app (`index.ts`) and the validation
 * tests (`tests/cors.validation.ts`) share identical logic.
 */

/**
 * Origins that are unconditionally trusted in production when `CORS_ORIGIN`
 * is not explicitly configured.  This ensures the EventFlow embedded widget
 * works out of the box after a fresh Railway deployment.
 */
export const PRODUCTION_FALLBACK_ORIGINS: ReadonlyArray<string> = [
  'https://event-flow.co.uk',
  'https://www.event-flow.co.uk',
];

/**
 * Resolve the effective CORS allowed-origins value from the environment.
 *
 * Rules (evaluated in order):
 *  1. `CORS_ORIGIN` is `*`                           → wildcard (all origins, no credentials).
 *  2. `CORS_ORIGIN` is a non-empty, comma-separated list → use that list exactly.
 *  3. `CORS_ORIGIN` is empty/unset + `NODE_ENV=production`
 *                                                    → PRODUCTION_FALLBACK_ORIGINS.
 *  4. `CORS_ORIGIN` is empty/unset + any other env   → wildcard (convenient for local dev).
 *
 * @param corsOriginEnv  Value of the `CORS_ORIGIN` environment variable (may be empty).
 * @param isProduction   Whether the server is running with `NODE_ENV=production`.
 * @returns `'*'` for wildcard, or an array of allowed origin strings.
 */
export function resolveAllowedOrigins(
  corsOriginEnv: string,
  isProduction: boolean,
): string | string[] {
  const trimmed = corsOriginEnv.trim();

  if (trimmed === '*') {
    return '*';
  }

  if (trimmed.length > 0) {
    return trimmed
      .split(',')
      .map((o) => o.trim())
      .filter((o) => o.length > 0);
  }

  // Empty / not configured — use a safe default depending on the environment.
  return isProduction ? [...PRODUCTION_FALLBACK_ORIGINS] : '*';
}
