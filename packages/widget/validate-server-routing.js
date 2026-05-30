#!/usr/bin/env node
/**
 * Validate the widget static server's API misrouting diagnostics.
 *
 * This catches the live Railway failure mode where /api/widget/chat reaches the
 * widget static server instead of the backend API and previously returned a
 * misleading plain-text 404 body of "Not Found".
 */

'use strict';

const http = require('http');
const path = require('path');
const { spawn } = require('child_process');

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed += 1;
  } else {
    console.error(`  ❌ FAIL: ${label}`);
    failed += 1;
  }
}

function request(port, method, requestPath, headers = {}, body) {
  return new Promise((resolve, reject) => {
    const payload = body === undefined ? undefined : JSON.stringify(body);
    const reqHeaders = { ...headers };
    if (payload !== undefined) {
      reqHeaders['Content-Type'] = 'application/json';
      reqHeaders['Content-Length'] = String(Buffer.byteLength(payload));
    }

    const req = http.request(
      {
        host: '127.0.0.1',
        port,
        method,
        path: requestPath,
        headers: reqHeaders,
      },
      (res) => {
        let raw = '';
        const responseHeaders = {};
        Object.entries(res.headers).forEach(([key, value]) => {
          responseHeaders[key.toLowerCase()] = Array.isArray(value) ? value.join(', ') : value;
        });
        res.on('data', (chunk) => {
          raw += chunk.toString();
        });
        res.on('end', () => {
          resolve({ status: res.statusCode, headers: responseHeaders, body: raw });
        });
      }
    );
    req.on('error', reject);
    if (payload !== undefined) req.write(payload);
    req.end();
  });
}

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = http.createServer();
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
    server.on('error', reject);
  });
}

function startWidgetServer(port) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(__dirname, 'server.js')], {
      cwd: __dirname,
      env: { ...process.env, PORT: String(port) },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let resolved = false;
    const timeout = setTimeout(() => {
      if (!resolved) {
        child.kill('SIGTERM');
        reject(new Error('Timed out waiting for widget server to start'));
      }
    }, 4000);

    child.stdout.on('data', (chunk) => {
      const output = chunk.toString();
      process.stdout.write(output);
      if (!resolved && output.includes('Widget static server running')) {
        resolved = true;
        clearTimeout(timeout);
        resolve(child);
      }
    });

    child.stderr.on('data', (chunk) => process.stderr.write(chunk));
    child.on('exit', (code) => {
      if (!resolved) {
        clearTimeout(timeout);
        reject(new Error(`Widget server exited before startup with code ${code}`));
      }
    });
  });
}

async function stopWidgetServer(child) {
  if (!child || child.killed) return;
  await new Promise((resolve) => {
    child.once('exit', resolve);
    child.kill('SIGTERM');
    setTimeout(resolve, 1000);
  });
}

async function main() {
  const port = await getFreePort();
  const child = await startWidgetServer(port);
  try {
    console.log('\n── Widget static server API misroute diagnostics ──');

    const preflight = await request(port, 'OPTIONS', '/api/widget/chat', {
      Origin: 'https://event-flow.co.uk',
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'Content-Type',
    });

    assert(preflight.status === 204, `OPTIONS /api/widget/chat returns 204, not ${preflight.status}`);
    assert(
      preflight.headers['access-control-allow-origin'] === 'https://event-flow.co.uk',
      'EventFlow origin receives ACAO on diagnostic preflight'
    );
    assert(
      preflight.headers['access-control-allow-credentials'] === 'true',
      'Diagnostic preflight allows credentials for EventFlow origin'
    );

    const post = await request(
      port,
      'POST',
      '/api/widget/chat',
      { Origin: 'https://event-flow.co.uk' },
      { message: 'Yes please' }
    );

    assert(post.status === 421, `POST /api/widget/chat returns 421 WRONG_SERVICE, not ${post.status}`);
    assert(
      post.headers['access-control-allow-origin'] === 'https://event-flow.co.uk',
      'Diagnostic POST includes EventFlow ACAO header'
    );

    let json = null;
    try {
      json = JSON.parse(post.body);
    } catch (_) {
      json = null;
    }
    assert(json && json.error && json.error.code === 'WRONG_SERVICE', 'Diagnostic body includes WRONG_SERVICE code');
    assert(post.body !== 'Not Found', 'Diagnostic body is no longer the old 9-byte Not Found response');
  } finally {
    await stopWidgetServer(child);
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error('Widget server routing validation failed:', err);
  process.exit(1);
});
