const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { execFileSync } = require('child_process');

const scriptPath = path.join(__dirname, '..', 'skills', 'e2e-test', 'scripts', 'run-test.js');

function runScript(args) {
    return execFileSync('node', [scriptPath, ...args], {
        encoding: 'utf8',
        timeout: 5000,
    });
}

function runScriptExpectFail(args) {
    try {
        execFileSync('node', [scriptPath, ...args], {
            encoding: 'utf8',
            timeout: 5000,
        });
        assert.fail('Expected script to exit with non-zero code');
    } catch (err) {
        return err;
    }
}

describe('run-test.js', () => {
    it('shows help with --help flag', () => {
        const stdout = runScript(['--help']);
        assert.ok(stdout.includes('Playwright Test Executor'));
        assert.ok(stdout.includes('--headed'));
        assert.ok(stdout.includes('--browser'));
    });

    it('shows help with no arguments', () => {
        const stdout = runScript([]);
        assert.ok(stdout.includes('Playwright Test Executor'));
    });

    it('rejects invalid browser', () => {
        const err = runScriptExpectFail(['--browser', 'opera', 'test.spec.js']);
        assert.ok(err.stderr.includes('Invalid browser "opera"'));
        assert.ok(err.stderr.includes('chromium, firefox, webkit'));
        assert.equal(err.status, 1);
    });

    it('rejects empty browser value', () => {
        const err = runScriptExpectFail(['--browser']);
        // --browser with no value results in undefined which fails validation
        assert.equal(err.status, 1);
    });

    it('errors when no test file specified', () => {
        const err = runScriptExpectFail(['--headed']);
        assert.ok(err.stderr.includes('No test file specified'));
        assert.equal(err.status, 1);
    });
});
