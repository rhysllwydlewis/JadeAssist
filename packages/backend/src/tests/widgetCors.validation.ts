/**
 * Widget chat CORS regression validation.
 *
 * Reproduces the live browser failure seen on EventFlow where:
 *   OPTIONS /api/widget/chat from https://event-flow.co.uk returned 404
 *   and did not include Access-Control-Allow-Origin.
 */

import express, { Request, Response } from 'express';
import cors, { CorsOptions } from 'cors';
import * as http from 'http';
import * as net from 'net';
import { resolveAllowedOrigins } from '../utils/cors';

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

function buildWidgetCorsApp(): express.Application {
  const app = express();
  const allowedOrigins = resolveAllowedOrigins('', true);
  const corsOptions: CorsOptions = {
    origin: allowedOrigins,
    credentials: allowedOrigins !== '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    optionsSuccessStatus: 204,
  };

  // Mirrors the production guard in index.ts.
  app.options('/api/widget/chat', cors(corsOptions), (_req: Request, res: Response) => {
    res.sendStatus(204);
  });
  app.options('*', cors(corsOptions));
  app.use(cors(corsOptions));
  app.use('/api/widget/chat', cors(corsOptions));
  app.use(express.json());
  app.post('/api/widget/chat', (_req, res) => {
    res.status(200).json({ success: true });
  });
  app.use((_req, res) => res.status(404).json({ error: 'Not found' }));
  return app;
}

function startServer(app: express.Application): Promise<{ server: http.Server; port: number }> {
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
  headers: Record<string, string>;
  body: string;
}

function makeRequest(
  port: number,
  path: string,
  method: string,
  headers: Record<string, string>,
  body?: unknown,
): Promise<RequestResult> {
  return new Promise((resolve, reject) => {
    const payload = body === undefined ? undefined : JSON.stringify(body);
    const reqHeaders: Record<string, string> = {
      Host: `localhost:${port}`,
      ...headers,
    };
    if (payload !== undefined) {
      reqHeaders['Content-Type'] = 'application/json';
      reqHeaders['Content-Length'] = String(Buffer.byteLength(payload));
    }

    const req = http.request(
      { host: '127.0.0.1', port, path, method, headers: reqHeaders },
      (res) => {
        let raw = '';
        const resHeaders: Record<string, string> = {};
        for (const [key, value] of Object.entries(res.headers)) {
          if (typeof value === 'string') resHeaders[key.toLowerCase()] = value;
          else if (Array.isArray(value)) resHeaders[key.toLowerCase()] = value.join(', ');
        }
        res.on('data', (chunk: Buffer) => { raw += chunk.toString(); });
        res.on('end', () => resolve({ status: res.statusCode ?? 0, headers: resHeaders, body: raw }));
      },
    );
    req.on('error', reject);
    if (payload !== undefined) req.write(payload);
    req.end();
  });
}

async function runTests(): Promise<void> {
  const { server, port } = await startServer(buildWidgetCorsApp());
  try {
    section('OPTIONS /api/widget/chat from EventFlow origin');
    for (const origin of ['https://event-flow.co.uk', 'https://www.event-flow.co.uk']) {
      const res = await makeRequest(port, '/api/widget/chat', 'OPTIONS', {
        Origin: origin,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type',
      });
      assert(res.status === 204, `${origin} preflight status is 204, not 404`);
      assert(res.headers['access-control-allow-origin'] === origin, `${origin} ACAO is reflected`);
      assert(res.headers['access-control-allow-credentials'] === 'true', `${origin} credentials allowed`);
    }

    section('POST /api/widget/chat from EventFlow origin');
    const post = await makeRequest(
      port,
      '/api/widget/chat',
      'POST',
      { Origin: 'https://event-flow.co.uk' },
      { message: 'Hello Jade' },
    );
    assert(post.status === 200, `POST status is 200 (got ${post.status})`);
    assert(
      post.headers['access-control-allow-origin'] === 'https://event-flow.co.uk',
      'POST response includes EventFlow ACAO header',
    );

    section('Disallowed origin is not granted CORS');
    const blocked = await makeRequest(port, '/api/widget/chat', 'OPTIONS', {
      Origin: 'https://evil.com',
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'Content-Type',
    });
    assert(!blocked.headers['access-control-allow-origin'], 'Disallowed origin receives no ACAO header');
  } finally {
    await stopServer(server);
  }

  console.log(`\n──────────────────────────────────`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log(`──────────────────────────────────\n`);
  if (failed > 0) process.exit(1);
}

runTests().catch((err: unknown) => {
  console.error('Widget CORS validation failed:', err);
  process.exit(1);
});
