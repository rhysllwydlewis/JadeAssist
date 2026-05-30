#!/usr/bin/env node
/**
 * Guard against the production misroute where the backend Railway service
 * reads the repo-root railway.toml and deploys the widget static server.
 */

'use strict';

const fs = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`✅ ${message}`);
    passed += 1;
    return;
  }

  console.error(`❌ ${message}`);
  failed += 1;
}

const rootConfigPath = path.join(__dirname, '..', 'railway.toml');
const rootConfig = fs.readFileSync(rootConfigPath, 'utf8');

assert(
  rootConfig.includes('buildCommand = "npm run build --workspace=packages/backend"'),
  'repo-root railway.toml builds the backend workspace'
);
assert(
  rootConfig.includes('startCommand = "npm run start --workspace=packages/backend"'),
  'repo-root railway.toml starts the backend workspace'
);
assert(
  !rootConfig.includes('dockerfilePath = "packages/widget/Dockerfile"'),
  'repo-root railway.toml does not deploy the widget Dockerfile'
);
assert(
  rootConfig.includes('healthcheckPath = "/healthz"'),
  'repo-root railway.toml keeps the Railway healthcheck on /healthz'
);

console.log(`\nRailway config validation: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
