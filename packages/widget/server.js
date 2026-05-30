#!/usr/bin/env node
/**
 * Production static file server for packages/widget/dist
 *
 * Usage:
 *   node server.js
 *
 * Environment variables:
 *   PORT  - Port to listen on (Railway sets this automatically; defaults to 3000)
 *
 * Endpoints:
 *   GET /healthz          -> 200 { ok: true }
 *   GET /jade-widget.js   -> serves the built widget bundle (immutable cache)
 *   GET /*                -> serves any file from dist/ (fallback: 404)
 *
 * IMPORTANT:
 *   This is the WIDGET STATIC SERVICE only. It does not implement the backend
 *   API. If /api/widget/chat reaches this service, Railway/domain routing is
 *   misconfigured and the widget is pointing at the wrong service/domain.
 */

'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = parseInt(process.env.PORT || '3000', 10);
const DIST_DIR = path.join(__dirname, 'dist');
const EVENTFLOW_ORIGINS = new Set(['https://event-flow.co.uk', 'https://www.event-flow.co.uk']);

/** Map file extensions to MIME types */
const MIME_TYPES = {
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

/** Minimum hex characters expected in a content-hash filename segment */
const MIN_HASH_LENGTH = 8;

/**
 * Determine if a file inside dist/ should be treated as immutable
 * (i.e. filename contains a content hash or is a versioned asset).
 * The main bundle (jade-widget.js) is not hashed so we give it a short
 * max-age to allow quick updates while still benefiting from caching.
 */
function cacheHeader(filename) {
  // Hashed assets (e.g. chunk-abc123.js) — cache forever
  if (new RegExp(`[.-][0-9a-f]{${MIN_HASH_LENGTH},}\\.(js|css)$`, 'i').test(filename)) {
    return 'public, max-age=31536000, immutable';
  }
  // Primary bundle — revalidate after 1 hour
  return 'public, max-age=3600';
}

function applyEventFlowCors(req, headers) {
  const origin = req.headers.origin;
  if (origin && EVENTFLOW_ORIGINS.has(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Vary'] = 'Origin';
    headers['Access-Control-Allow-Credentials'] = 'true';
  }
  return headers;
}

function sendJson(req, res, status, body, extraHeaders = {}) {
  const payload = JSON.stringify(body);
  res.writeHead(
    status,
    applyEventFlowCors(req, {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Length': Buffer.byteLength(payload),
      'Cache-Control': 'no-store',
      ...extraHeaders,
    })
  );
  res.end(payload);
}

const server = http.createServer((req, res) => {
  const url = req.url ? req.url.split('?')[0] : '/';

  // Health endpoint (Railway readiness / liveness probe)
  if (url === '/healthz') {
    sendJson(req, res, 200, { ok: true, service: 'jadeassist-widget-static' });
    return;
  }

  // If the backend API reaches the widget static server, fail loudly and with
  // CORS headers so the browser exposes the useful diagnostic instead of a
  // misleading CORS/preflight error. This does not replace the backend; it
  // proves the Railway domain or EventFlow apiBaseUrl is pointing at the wrong
  // service.
  if (url.startsWith('/api/')) {
    if (req.method === 'OPTIONS') {
      res.writeHead(
        204,
        applyEventFlowCors(req, {
          'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Requested-With',
          'Cache-Control': 'no-store',
        })
      );
      res.end();
      return;
    }

    sendJson(req, res, 421, {
      success: false,
      error: {
        code: 'WRONG_SERVICE',
        message:
          'This Railway service is serving the JadeAssist widget bundle, not the JadeAssist backend API. Point the widget apiBaseUrl at the backend service domain.',
      },
      expectedBackendPath: '/api/widget/chat',
      currentService: 'jadeassist-widget-static',
      remediation: [
        'Deploy the backend service from the repo-root railway.toml or packages/backend.',
        'Set the widget apiBaseUrl to the backend service domain, not the widget/static domain.',
        'Verify GET /healthz on the backend domain returns a JadeAssist API health response.',
      ],
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Resolve requested path inside dist/
  const safePath = path.normalize(url).replace(/^(\.\.(\/|\\|$))+/, '');
  const filePath = path.join(DIST_DIR, safePath);

  // Prevent path traversal outside dist/
  if (!filePath.startsWith(DIST_DIR + path.sep) && filePath !== DIST_DIR) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stat.size,
      'Cache-Control': cacheHeader(path.basename(filePath)),
      'X-Content-Type-Options': 'nosniff',
    });

    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`Widget static server running on port ${PORT}`);
  console.log(`Serving files from: ${DIST_DIR}`);
});

// Graceful shutdown (Railway sends SIGTERM)
process.on('SIGTERM', () => {
  server.close(() => {
    console.log('Server closed gracefully');
    process.exit(0);
  });
});
