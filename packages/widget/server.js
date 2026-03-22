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
 */

'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = parseInt(process.env.PORT || '3000', 10);
const DIST_DIR = path.join(__dirname, 'dist');

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

const server = http.createServer((req, res) => {
  const url = req.url ? req.url.split('?')[0] : '/';

  // Health endpoint (Railway readiness / liveness probe)
  if (url === '/healthz') {
    const body = JSON.stringify({ ok: true });
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
    });
    res.end(body);
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
