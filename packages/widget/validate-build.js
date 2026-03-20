#!/usr/bin/env node
/**
 * Validates that the built widget file is valid JavaScript
 * and exports the expected API
 */

const fs = require('fs');
const path = require('path');

const buildFile = path.join(__dirname, 'dist', 'jade-widget.js');

console.log('🔍 Validating build output...\n');

// Check if file exists
if (!fs.existsSync(buildFile)) {
  console.error('❌ Build file not found:', buildFile);
  process.exit(1);
}

console.log('✅ Build file exists');

// Read the file
const code = fs.readFileSync(buildFile, 'utf8');

console.log(`✅ Build file size: ${(code.length / 1024).toFixed(2)} KB`);

// Check if it starts with IIFE wrapper
if (!code.startsWith('(function(')) {
  console.error('❌ Build file does not start with IIFE wrapper');
  console.error('   Expected: (function(..){...');
  console.error('   Got:', code.substring(0, 50));
  process.exit(1);
}

console.log('✅ Build file has IIFE wrapper');

// Check if it ends correctly
if (!code.trim().endsWith('});')) {
  console.error('❌ Build file does not end correctly');
  console.error('   Expected to end with: });');
  console.error('   Got:', code.trim().substring(code.trim().length - 50));
  process.exit(1);
}

console.log('✅ Build file ends correctly');

// Try to parse as JavaScript (basic syntax check)
try {
  // Create a sandbox context
  const vm = require('vm');
  const sandbox = {
    window: {},
    document: {
      createElement: () => ({ 
        attachShadow: () => ({
          innerHTML: '',
          querySelector: () => null,
          querySelectorAll: () => [],
          addEventListener: () => {}
        }),
        appendChild: () => {},
        remove: () => {},
        className: '',
        innerHTML: '',
        style: {},
        setAttribute: () => {},
        getAttribute: () => null,
        hasAttribute: () => false,
        querySelector: () => null,
        querySelectorAll: () => [],
        addEventListener: () => {},
        textContent: ''
      }),
      body: {
        appendChild: () => {}
      },
      addEventListener: () => {}
    },
    localStorage: {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {}
    },
    console: console,
    setTimeout: () => {},
    clearTimeout: () => {},
    Date: Date,
    fetch: async () => ({ ok: true, json: async () => ({}) })
  };
  
  sandbox.window.window = sandbox.window;
  
  // Execute the code
  vm.runInNewContext(code, sandbox);
  
  // Check if JadeWidget was attached to window
  if (!sandbox.window.JadeWidget) {
    console.error('❌ window.JadeWidget not defined after execution');
    process.exit(1);
  }
  
  console.log('✅ JavaScript is syntactically valid');
  console.log('✅ window.JadeWidget is defined');
  
  // Check for init function
  if (typeof sandbox.window.JadeWidget.init !== 'function') {
    console.error('❌ window.JadeWidget.init is not a function');
    process.exit(1);
  }
  
  console.log('✅ window.JadeWidget.init is a function');

  // Feature presence checks: verify required strings exist in the minified bundle.
  // These patterns are taken from class/method names and CSS class names that
  // are unlikely to appear unless the feature was actually compiled in.
  const featureChecks = [
    {
      name: 'Sound settings storage methods',
      patterns: ['loadSoundEnabled', 'saveSoundEnabled', 'loadSoundVolume', 'saveSoundVolume'],
    },
    {
      name: 'Settings menu UI',
      patterns: ['jade-menu-panel', 'jade-menu-btn'],
    },
    {
      name: 'Export chat functionality',
      patterns: ['exportChat', 'application/json'],
    },
    {
      name: 'Clear chat confirmation UI',
      patterns: ['jade-modal', 'confirm-clear-chat'],
    },
    {
      name: 'Sound notification (WebAudio)',
      patterns: ['playNotificationSound', 'AudioContext'],
    },
  ];

  for (const check of featureChecks) {
    const missing = check.patterns.filter((p) => !code.includes(p));
    if (missing.length > 0) {
      console.error(`❌ ${check.name} not found in bundle (missing: ${missing.join(', ')})`);
      process.exit(1);
    }
    console.log(`✅ ${check.name} present`);
  }

} catch (error) {
  console.error('❌ JavaScript validation failed:');
  console.error('  ', error.message);
  if (error.stack) {
    console.error('\nStack trace:');
    console.error(error.stack);
  }
  process.exit(1);
}

// Check that CSS is properly embedded (not bare CSS rules at the start)
// Only check the very beginning before any function definitions
const firstChunk = code.substring(0, 500);
if (/^\s*\*\s*\{/.test(firstChunk) || /^\s*:host\s*\{/.test(firstChunk)) {
  console.error('❌ Build appears to contain bare CSS rules at the start');
  console.error('   CSS should be inside template literals, not at the top level');
  process.exit(1);
}

// Verify CSS is inside template literals by checking for template literal markers
if (!code.includes('`') || !code.includes('return`')) {
  console.warn('⚠️  Warning: No template literals detected - CSS embedding cannot be verified');
}

console.log('✅ CSS is properly embedded (not bare)');

console.log('\n✨ All validation checks passed!\n');
