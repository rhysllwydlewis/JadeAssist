#!/usr/bin/env node
/**
 * Guard against production Railway regressions:
 * - repo root must deploy the backend workspace, not the widget server;
 * - backend deploys must default to auto mode so missing secrets do not crash
 *   first-time deployments, while configured services still enable the agent.
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
  rootConfig.includes('JADEASSIST_MINIMAL_MODE=${JADEASSIST_MINIMAL_MODE:-auto} npm run start --workspace=packages/backend'),
  'repo-root railway.toml starts backend in auto mode by default'
);
assert(
  !rootConfig.includes('JADEASSIST_MINIMAL_MODE=${JADEASSIST_MINIMAL_MODE:-true}'),
  'repo-root railway.toml does not force minimal mode when secrets exist'
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
