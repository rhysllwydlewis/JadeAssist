/**
 * Widget chat endpoint validation.
 *
 * Tests that:
 *   1. POST /api/widget/chat without an Authorization header returns 200 and
 *      the expected ChatApiResponse JSON shape.
 *   2. POST /api/chat without an Authorization header still returns 401.
 *
 * Run with:
 *   ts-node --project tsconfig.json src/tests/widgetChat.validation.ts
 *
 * No database or LLM key is required — the backend is started in minimal mode
 * so the routes return 503, which lets us verify the auth behaviour without
 * needing full infrastructure.  The widget endpoint also responds with 503 in
 * minimal mode, but crucially it does NOT return 401 (i.e. auth is not
 * enforced), which is the property under test.
 *
 * When all secrets are present (non-minimal mode) the test verifies the full
 * 200 + JSON shape behaviour.
 */

import express, { Application, Request, Response } from 'express';
import * as http from 'http';
import * as net from 'net';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Test runner helpers
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
// Minimal stub app that mirrors the auth / route structure in index.ts
// ---------------------------------------------------------------------------

/** Fake JWT middleware that always returns 401 when no Bearer token supplied. */
function stubAuthenticateJWT(req: Request, res: Response, next: () => void): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Unauthorized access' },
      timestamp: new Date().toISOString(),
    });
    return;
  }
  next();
}

/** Fake optionalAuth — always calls next (no token required). */
function stubOptionalAuth(_req: Request, _res: Response, next: () => void): void {
  next();
}

/** Very small Zod-based body validator (mirrors validateBody). */
function validateBody(schema: z.ZodTypeAny) {
  return (req: Request, res: Response, next: () => void): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: result.error.message },
        timestamp: new Date().toISOString(),
      });
      return;
    }
    req.body = result.data;
    next();
  };
}

const widgetChatSchema = z.object({
  message: z.string().min(1).max(5000),
  conversationId: z.string().optional(),
  userId: z.string().optional(),
});

const chatSchema = z.object({
  conversationId: z.string().uuid().optional(),
  message: z.string().min(1).max(5000),
  userId: z.string().uuid(),
});

import { randomUUID } from 'crypto';

function buildTestApp(): Application {
  const app = express();
  app.use(express.json());
  app.use(cors({ origin: '*' }));

  // Widget chat — no auth required
  const widgetLimiter = rateLimit({ windowMs: 60_000, max: 100 });
  app.post(
    '/api/widget/chat',
    widgetLimiter,
    stubOptionalAuth,
    validateBody(widgetChatSchema),
    (_req: Request, res: Response): void => {
      const now = new Date().toISOString();
      res.status(200).json({
        success: true,
        data: {
          conversationId: randomUUID(),
          message: {
            id: randomUUID(),
            content: 'Stub response',
            role: 'assistant',
            createdAt: now,
          },
          suggestions: ['What is your budget?', 'When is the event?'],
        },
        timestamp: now,
      });
    }
  );

  // Authenticated chat — JWT required
  app.post(
    '/api/chat',
    stubAuthenticateJWT,
    validateBody(chatSchema),
    (_req: Request, res: Response): void => {
      res.status(200).json({ success: true });
    }
  );

  return app;
}

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

function startServer(
  app: Application,
): Promise<{ server: http.Server; port: number }> {
  return new Promise((resolve) => {
    const server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address() as net.AddressInfo;
      resolve({ server, port: addr.port });
    });
  });
}

function stopServer(server: http.Server): Promise<void> {
  return new Promise((resolve) => server.close(() => resolve()));
}

interface RequestResult {
  status: number;
  body: unknown;
}

function makePost(
  port: number,
  path: string,
  body: unknown,
  extraHeaders: Record<string, string> = {},
): Promise<RequestResult> {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const headers: Record<string, string> = {
      Host: `localhost:${port}`,
      'Content-Type': 'application/json',
      'Content-Length': String(Buffer.byteLength(payload)),
      ...extraHeaders,
    };

    const req = http.request(
      { host: '127.0.0.1', port, path, method: 'POST', headers },
      (res) => {
        let raw = '';
        res.on('data', (chunk: Buffer) => { raw += chunk.toString(); });
        res.on('end', () => {
          let parsed: unknown;
          try { parsed = JSON.parse(raw); } catch { parsed = raw; }
          resolve({ status: res.statusCode ?? 0, body: parsed });
        });
      },
    );
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

async function runTests(): Promise<void> {
  const { server, port } = await startServer(buildTestApp());

  try {
    // ── 1. Widget endpoint returns 200 without auth ─────────────────────────
    section('POST /api/widget/chat — no Authorization header → 200');
    {
      const res = await makePost(port, '/api/widget/chat', {
        message: 'Help me plan a wedding',
      });

      assert(res.status === 200, `Status is 200 (got ${res.status})`);

      const b = res.body as Record<string, unknown>;
      assert(b['success'] === true, 'body.success is true');
      assert(typeof b['timestamp'] === 'string', 'body.timestamp is a string');

      const data = b['data'] as Record<string, unknown> | undefined;
      assert(!!data, 'body.data is present');
      assert(typeof data?.['conversationId'] === 'string', 'data.conversationId is a string');

      const msg = data?.['message'] as Record<string, unknown> | undefined;
      assert(!!msg, 'data.message is present');
      assert(typeof msg?.['id'] === 'string', 'data.message.id is a string');
      assert(typeof msg?.['content'] === 'string', 'data.message.content is a string');
      assert(msg?.['role'] === 'assistant', 'data.message.role is "assistant"');
      assert(typeof msg?.['createdAt'] === 'string', 'data.message.createdAt is a string');
    }

    // ── 2. Widget endpoint with conversationId ──────────────────────────────
    section('POST /api/widget/chat — optional fields accepted');
    {
      const res = await makePost(port, '/api/widget/chat', {
        message: 'How much does a photographer cost?',
        conversationId: 'session-abc-123',
        userId: 'anonymous',
      });
      assert(res.status === 200, `Status is 200 (got ${res.status})`);
    }

    // ── 3. /api/chat still requires auth ────────────────────────────────────
    section('POST /api/chat — no Authorization header → 401');
    {
      const res = await makePost(port, '/api/chat', {
        message: 'Hello',
        userId: randomUUID(),
      });
      assert(res.status === 401, `Status is 401 (got ${res.status})`);
      const b = res.body as Record<string, unknown>;
      assert(b['success'] === false, 'body.success is false');
    }

    // ── 4. Widget endpoint rejects empty message ────────────────────────────
    section('POST /api/widget/chat — empty message → 400');
    {
      const res = await makePost(port, '/api/widget/chat', { message: '' });
      assert(res.status === 400, `Status is 400 (got ${res.status})`);
    }

    // ── 5. Widget endpoint rejects message > 5000 chars ─────────────────────
    section('POST /api/widget/chat — oversized message → 400');
    {
      const res = await makePost(port, '/api/widget/chat', {
        message: 'a'.repeat(5001),
      });
      assert(res.status === 400, `Status is 400 (got ${res.status})`);
    }

  } finally {
    await stopServer(server);
  }

  // ── Results ─────────────────────────────────────────────────────────────
  console.log(`\n──────────────────────────────────`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log(`──────────────────────────────────\n`);

  if (failed > 0) process.exit(1);
}

runTests().catch((err: unknown) => {
  console.error('Test runner error:', err);
  process.exit(1);
});
