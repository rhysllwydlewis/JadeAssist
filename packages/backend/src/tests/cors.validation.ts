/**
 * CORS behaviour validation.
 *
 * Tests that the CORS middleware correctly:
 *   1. Allows requests from listed origins and returns the expected headers.
 *   2. Does NOT return CORS headers for unlisted origins.
 *   3. Handles OPTIONS preflight correctly.
 *   4. Falls back to wildcard '*' when configured as such.
 *   5. Uses PRODUCTION_FALLBACK_ORIGINS when CORS_ORIGIN is empty in production.
 *   6. Does NOT apply the production fallback when CORS_ORIGIN='*' (explicit override).
 *
 * Run with:
 *   ts-node --project tsconfig.json src/tests/cors.validation.ts
 *
 * No database, LLM, or JWT secret is required — pure HTTP-level tests.
 */

import express from 'express';
import cors from 'cors';
import * as http from 'http';
import * as net from 'net';
import {
  resolveAllowedOrigins,
  PRODUCTION_FALLBACK_ORIGINS,
} from '../utils/cors';

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
// Helpers — minimal Express app + HTTP utilities
// ---------------------------------------------------------------------------

/**
 * Build a minimal Express app wired up with the same CORS logic used in
 * packages/backend/src/index.ts so the tests reflect real behaviour.
 *
 * @param corsOriginEnv  Value of the CORS_ORIGIN env var (may be empty).
 * @param isProduction   Whether to treat this as a production environment.
 */
function buildCorsApp(
  corsOriginEnv: string,
  isProduction = false,
): express.Application {
  const app = express();
  const allowedOrigins = resolveAllowedOrigins(corsOriginEnv, isProduction);
  const isWildcard = allowedOrigins === '*';

  // Explicit preflight handler (mirrors index.ts)
  app.options('*', cors({ origin: allowedOrigins, credentials: !isWildcard }));
  app.use(cors({ origin: allowedOrigins, credentials: !isWildcard }));
  app.get('/test', (_req, res) => res.json({ ok: true }));
  app.post('/test', (_req, res) => res.json({ ok: true }));
  return app;
}

/** Start the app on a random OS-assigned port. */
function startServer(
  app: express.Application,
): Promise<{ server: http.Server; port: number }> {
  return new Promise((resolve) => {
    const server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address() as net.AddressInfo;
      resolve({ server, port: addr.port });
    });
  });
}

/** Close a server and wait for all connections to finish. */
function stopServer(server: http.Server): Promise<void> {
  return new Promise((resolve) => server.close(() => resolve()));
}

interface RequestResult {
  status: number;
  headers: Record<string, string>;
}

/** Make a raw HTTP request and return status + response headers. */
function makeRequest(
  port: number,
  path: string,
  method: string,
  reqHeaders: Record<string, string>,
): Promise<RequestResult> {
  return new Promise((resolve, reject) => {
    const headers: Record<string, string> = {
      Host: `localhost:${port}`,
      ...reqHeaders,
    };

    const req = http.request(
      { host: '127.0.0.1', port, path, method, headers },
      (res) => {
        const resHeaders: Record<string, string> = {};
        for (const [key, value] of Object.entries(res.headers)) {
          if (typeof value === 'string') {
            resHeaders[key.toLowerCase()] = value;
          } else if (Array.isArray(value)) {
            resHeaders[key.toLowerCase()] = value.join(', ');
          }
        }
        // Consume the response body so the connection can close.
        res.resume();
        res.on('end', () =>
          resolve({ status: res.statusCode ?? 0, headers: resHeaders }),
        );
      },
    );
    req.on('error', reject);
    req.end();
  });
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

const EVENTFLOW_ORIGINS = [
  'https://event-flow.co.uk',
  'https://www.event-flow.co.uk',
];

const DEV_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:5173',
];

const ALL_ALLOWED_CSV = [...EVENTFLOW_ORIGINS, ...DEV_ORIGINS].join(',');

async function runTests(): Promise<void> {
  // ── 1. Allowed origins receive ACAO header ──────────────────────────────
  section('Allowed origins receive correct CORS headers');

  {
    const { server, port } = await startServer(buildCorsApp(ALL_ALLOWED_CSV));
    try {
      for (const origin of [...EVENTFLOW_ORIGINS, ...DEV_ORIGINS]) {
        const res = await makeRequest(port, '/test', 'GET', { Origin: origin });
        assert(
          res.headers['access-control-allow-origin'] === origin,
          `${origin} → Access-Control-Allow-Origin: ${origin}`,
        );
        assert(
          res.headers['access-control-allow-credentials'] === 'true',
          `${origin} → Access-Control-Allow-Credentials: true`,
        );
      }
    } finally {
      await stopServer(server);
    }
  }

  // ── 2. Disallowed origins do NOT get ACAO header ─────────────────────────
  section('Disallowed origins do not receive CORS headers');

  {
    const { server, port } = await startServer(buildCorsApp(ALL_ALLOWED_CSV));
    try {
      const disallowed = [
        'https://evil.com',
        'https://attacker.io',
        // Note: event-flow.com (not .co.uk) is NOT in the allowlist.
        'https://event-flow.com',
      ];
      for (const origin of disallowed) {
        const res = await makeRequest(port, '/test', 'GET', { Origin: origin });
        assert(
          !res.headers['access-control-allow-origin'],
          `${origin} → no Access-Control-Allow-Origin header (blocked)`,
        );
      }
    } finally {
      await stopServer(server);
    }
  }

  // ── 3. OPTIONS preflight returns correct headers ──────────────────────────
  section('OPTIONS preflight returns correct headers');

  {
    const { server, port } = await startServer(buildCorsApp(ALL_ALLOWED_CSV));
    try {
      const origin = 'https://event-flow.co.uk';
      const res = await makeRequest(port, '/test', 'OPTIONS', {
        Origin: origin,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type, Authorization',
      });

      assert(
        res.status === 204,
        'OPTIONS preflight → HTTP 204 No Content',
      );
      assert(
        res.headers['access-control-allow-origin'] === origin,
        `OPTIONS preflight → Access-Control-Allow-Origin: ${origin}`,
      );
      assert(
        !!res.headers['access-control-allow-methods'],
        'OPTIONS preflight → Access-Control-Allow-Methods header present',
      );
      assert(
        res.headers['access-control-allow-credentials'] === 'true',
        'OPTIONS preflight → Access-Control-Allow-Credentials: true',
      );
    } finally {
      await stopServer(server);
    }
  }

  // ── 4. Disallowed origin preflight is not granted ─────────────────────────
  section('OPTIONS preflight for disallowed origin is not granted');

  {
    const { server, port } = await startServer(buildCorsApp(ALL_ALLOWED_CSV));
    try {
      const origin = 'https://evil.com';
      const res = await makeRequest(port, '/test', 'OPTIONS', {
        Origin: origin,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type',
      });
      assert(
        !res.headers['access-control-allow-origin'],
        `Disallowed origin preflight → no Access-Control-Allow-Origin`,
      );
    } finally {
      await stopServer(server);
    }
  }

  // ── 5. Wildcard (*) mode allows any origin ────────────────────────────────
  section('Wildcard (*) mode — any origin is reflected as *');

  {
    const { server, port } = await startServer(buildCorsApp('*'));
    try {
      const origins = [
        'https://anything.com',
        'https://event-flow.co.uk',
        'http://localhost:5173',
      ];
      for (const origin of origins) {
        const res = await makeRequest(port, '/test', 'GET', { Origin: origin });
        assert(
          res.headers['access-control-allow-origin'] === '*',
          `Wildcard → Access-Control-Allow-Origin: * for ${origin}`,
        );
        // Access-Control-Allow-Credentials must NOT be 'true' when origin is *.
        assert(
          res.headers['access-control-allow-credentials'] !== 'true',
          `Wildcard → Access-Control-Allow-Credentials is NOT true (spec compliance)`,
        );
      }
    } finally {
      await stopServer(server);
    }
  }

  // ── 6. resolveAllowedOrigins — production fallback ───────────────────────
  section('resolveAllowedOrigins — empty CORS_ORIGIN in production uses fallback');

  {
    const result = resolveAllowedOrigins('', true);
    assert(
      Array.isArray(result),
      'empty CORS_ORIGIN + production → returns an array',
    );
    if (Array.isArray(result)) {
      for (const origin of PRODUCTION_FALLBACK_ORIGINS) {
        assert(
          result.includes(origin),
          `production fallback includes ${origin}`,
        );
      }
    }
  }

  // ── 7. resolveAllowedOrigins — production fallback (live HTTP) ───────────
  section('Production fallback — EventFlow origins allowed, others blocked');

  {
    // Simulate a production deployment with CORS_ORIGIN not set (empty string).
    const { server, port } = await startServer(buildCorsApp('', true));
    try {
      for (const origin of EVENTFLOW_ORIGINS) {
        const res = await makeRequest(port, '/test', 'OPTIONS', {
          Origin: origin,
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type',
        });
        assert(
          res.headers['access-control-allow-origin'] === origin,
          `Production fallback preflight: ${origin} → ACAO: ${origin}`,
        );
        assert(
          res.headers['access-control-allow-credentials'] === 'true',
          `Production fallback preflight: ${origin} → credentials: true`,
        );
      }

      // Unknown origins must still be blocked.
      const blockedOrigins = [
        'https://evil.com',
        // HTTP (non-HTTPS) variants of the EventFlow domains must also be blocked
        // in production — the fallback only allows the HTTPS versions.
        'http://event-flow.co.uk',
        'http://www.event-flow.co.uk',
      ];
      for (const blocked of blockedOrigins) {
        const blockedRes = await makeRequest(port, '/test', 'OPTIONS', {
          Origin: blocked,
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type',
        });
        assert(
          !blockedRes.headers['access-control-allow-origin'],
          `Production fallback: ${blocked} → no ACAO header (blocked)`,
        );
      }
    } finally {
      await stopServer(server);
    }
  }

  // ── 8. resolveAllowedOrigins — explicit '*' overrides fallback ───────────
  section('Explicit CORS_ORIGIN=* always yields wildcard, even in production');

  {
    const result = resolveAllowedOrigins('*', true);
    assert(result === '*', 'explicit * in production → wildcard');

    const { server, port } = await startServer(buildCorsApp('*', true));
    try {
      const res = await makeRequest(port, '/test', 'GET', {
        Origin: 'https://anything.com',
      });
      assert(
        res.headers['access-control-allow-origin'] === '*',
        'explicit * in production → ACAO: *',
      );
    } finally {
      await stopServer(server);
    }
  }

  // ── 9. resolveAllowedOrigins — empty CORS_ORIGIN in dev uses wildcard ────
  section('Empty CORS_ORIGIN in non-production uses wildcard');

  {
    const result = resolveAllowedOrigins('', false);
    assert(result === '*', 'empty CORS_ORIGIN + non-production → wildcard');
  }

  // ── Results ────────────────────────────────────────────────────────────────
  console.log(`\n──────────────────────────────────`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log(`──────────────────────────────────\n`);

  if (failed > 0) process.exit(1);
}

runTests().catch((err: unknown) => {
  console.error('Test runner error:', err);
  process.exit(1);
});
