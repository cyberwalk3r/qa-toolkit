#!/usr/bin/env node

/**
 * QA Toolkit — Playwright Test Executor
 * 
 * Usage: node run-test.js [options] <test-file>
 * 
 * Options:
 *   --help          Show this help message
 *   --headed        Run tests with browser visible (default: headless)
 *   --browser <b>   Browser: chromium, firefox, webkit (default: chromium)
 *   --slow          Run in slow motion (1 second between steps)
 *   --debug         Run with Playwright Inspector for debugging
 *   --report        Generate HTML report after run
 * 
 * Examples:
 *   node run-test.js qa-artifacts/e2e-tests/e2e-login.spec.js
 *   node run-test.js --headed --slow qa-artifacts/e2e-tests/e2e-checkout.spec.js
 *   node run-test.js --browser firefox --report qa-artifacts/e2e-tests/*.spec.js
 */

const { execSync } = require('child_process');
const path = require('path');

const args = process.argv.slice(2);

if (args.includes('--help') || args.length === 0) {
    console.log(`
QA Toolkit — Playwright Test Executor

Usage: node run-test.js [options] <test-file>

Options:
  --help          Show this help message
  --headed        Run tests with browser visible (default: headless)
  --browser <b>   Browser: chromium, firefox, webkit (default: chromium)
  --slow          Run in slow motion (1 second between steps)
  --debug         Run with Playwright Inspector for debugging
  --report        Generate HTML report after run

Examples:
  node run-test.js qa-artifacts/e2e-tests/e2e-login.spec.js
  node run-test.js --headed --slow qa-artifacts/e2e-tests/e2e-checkout.spec.js
  node run-test.js --browser firefox --report qa-artifacts/e2e-tests/*.spec.js
  `);
    process.exit(0);
}

// Parse flags
const headed = args.includes('--headed');
const slow = args.includes('--slow');
const debug = args.includes('--debug');
const report = args.includes('--report');
const browserIdx = args.indexOf('--browser');
const browser = browserIdx >= 0 ? args[browserIdx + 1] : 'chromium';

// Get test files (everything that's not a flag)
const flagsWithValues = new Set(['--browser']);
const testFiles = args.filter((arg, i) => {
    if (arg.startsWith('--')) return false;
    if (i > 0 && flagsWithValues.has(args[i - 1])) return false;
    return true;
});

if (testFiles.length === 0) {
    console.error('Error: No test file specified. Use --help for usage.');
    process.exit(1);
}

// Build Playwright command
let cmd = `npx playwright test ${testFiles.join(' ')}`;
cmd += ` --project=${browser}`;
if (headed) cmd += ' --headed';
if (slow) cmd += ' --slow-mo=1000';
if (debug) cmd += ' --debug';
if (report) cmd += ' --reporter=html';

console.log(`Running: ${cmd}\n`);

try {
    execSync(cmd, { stdio: 'inherit', cwd: process.cwd() });
} catch (err) {
    process.exit(err.status || 1);
}
