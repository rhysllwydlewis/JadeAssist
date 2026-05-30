/**
 * Widget chat route method validation.
 * Ensures OPTIONS/GET/HEAD /api/widget/chat do not regress to opaque 404s.
 */

import express from 'express';
import * as http from 'http';
import * as net from 'net';
import widgetChatRouter from '../routes/widgetChat';

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

function startServer(): Promise<{ server: http.Server; port: number }> {
  const app = express();
  app.use(express.json());
  app.use('/api/widget/chat', widgetChatRouter);
  app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

  return new Promise(resolve => {
    const server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address() as net.AddressInfo;
      resolve({ server, port: addr.port });
    });
  });
}

function stopServer(server: http.Server): Promise<void> {
  return new Promise(resolve => server.close(() => resolve()));
}

function request(port: number, method: string): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, path: '/api/widget/chat', method }, res => {
      let body = '';
      res.on('data', chunk => {
        body += chunk.toString();
      });
      res.on('end', () => resolve({ status: res.statusCode ?? 0, body }));
    });
    req.on('error', reject);
    req.end();
  });
}

async function main(): Promise<void> {
  const { server, port } = await startServer();
  try {
    const options = await request(port, 'OPTIONS');
    assert(options.status === 204, `OPTIONS returns 204, not ${options.status}`);

    const get = await request(port, 'GET');
    assert(get.status === 405, `GET returns 405, not ${get.status}`);
    assert(get.body.includes('METHOD_NOT_ALLOWED'), 'GET body includes METHOD_NOT_ALLOWED');

    const head = await request(port, 'HEAD');
    assert(head.status === 405, `HEAD returns 405, not ${head.status}`);

    assert(options.status !== 404 && get.status !== 404 && head.status !== 404, 'No diagnostic method returns 404');
  } finally {
    await stopServer(server);
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main().catch(err => {
  console.error('Widget chat route method validation failed:', err);
  process.exit(1);
});
