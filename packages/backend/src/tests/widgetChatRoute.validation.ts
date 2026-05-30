/**
 * Widget chat route method validation.
 * Ensures diagnostic / unsupported methods for /api/widget/chat do not regress
 * to opaque 404s, and that importing the route is safe in the standalone test
 * environment.
 */

import express from 'express';
import * as http from 'http';
import * as net from 'net';

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

function configureRouteImportEnv(): void {
  process.env['NODE_ENV'] = process.env['NODE_ENV'] ?? 'test';
  process.env['MONGODB_URL'] =
    process.env['MONGODB_URL'] ?? 'mongodb://127.0.0.1:27017/jadeassist-test';
  process.env['OPENAI_API_KEY'] = process.env['OPENAI_API_KEY'] ?? 'test-openai-key';
  process.env['JWT_SECRET'] = process.env['JWT_SECRET'] ?? 'test-jwt-secret';
}

function startServer(): Promise<{ server: http.Server; port: number }> {
  configureRouteImportEnv();
  const { default: widgetChatRouter } =
    require('../routes/widgetChat') as typeof import('../routes/widgetChat');

  const app = express();
  app.use(express.json());
  app.use('/api/widget/chat', widgetChatRouter);
  app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

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
  body: string;
  allow: string | undefined;
}

function request(port: number, method: string): Promise<RequestResult> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { host: '127.0.0.1', port, path: '/api/widget/chat', method },
      (res) => {
        let body = '';
        res.on('data', (chunk) => {
          body += chunk.toString();
        });
        res.on('end', () =>
          resolve({ status: res.statusCode ?? 0, body, allow: res.headers.allow })
        );
      }
    );
    req.on('error', reject);
    req.end();
  });
}

async function main(): Promise<void> {
  const { server, port } = await startServer();
  try {
    const options = await request(port, 'OPTIONS');
    assert(options.status === 204, `OPTIONS returns 204, not ${options.status}`);
    assert(options.allow === 'OPTIONS, POST', 'OPTIONS includes Allow: OPTIONS, POST');

    const unsupportedMethods = ['GET', 'HEAD', 'PUT', 'PATCH', 'DELETE'];
    for (const method of unsupportedMethods) {
      const response = await request(port, method);
      assert(response.status === 405, `${method} returns 405, not ${response.status}`);
      assert(response.allow === 'OPTIONS, POST', `${method} includes Allow: OPTIONS, POST`);
      assert(response.status !== 404, `${method} does not return 404`);

      if (method === 'HEAD') {
        assert(response.body === '', 'HEAD response body is empty');
      } else {
        assert(
          response.body.includes('METHOD_NOT_ALLOWED'),
          `${method} body includes METHOD_NOT_ALLOWED`
        );
      }
    }
  } finally {
    await stopServer(server);
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error('Widget chat route method validation failed:', err);
  process.exit(1);
});
