#!/usr/bin/env node

/**
 * QA Toolkit — State Manager Tests
 *
 * Tests all 5 subcommands: read, write, merge, init, archive.
 * Uses Node.js stdlib only (no test framework).
 */

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'state-manager.js');
const TEST_DIR = path.join(__dirname, '..', '__test_tmp__');
const QA_DIR = path.join(TEST_DIR, 'qa-artifacts');
const PROJECT_STATE = path.join(QA_DIR, '.qa-context.json');
const SESSION_STATE = path.join(QA_DIR, '.qa-session.json');
const SESSIONS_DIR = path.join(QA_DIR, 'sessions');

function setup() {
    if (fs.existsSync(TEST_DIR)) {
        fs.rmSync(TEST_DIR, { recursive: true });
    }
    fs.mkdirSync(TEST_DIR, { recursive: true });
    // Copy settings.json so script can find outputDir
    fs.copyFileSync(
        path.join(__dirname, '..', 'settings.json'),
        path.join(TEST_DIR, 'settings.json')
    );
}

function teardown() {
    if (fs.existsSync(TEST_DIR)) {
        fs.rmSync(TEST_DIR, { recursive: true });
    }
}

function run(args) {
    return execFileSync('node', [SCRIPT, ...args], {
        cwd: TEST_DIR,
        env: { ...process.env, CLAUDE_PLUGIN_ROOT: TEST_DIR },
        encoding: 'utf8',
        timeout: 5000,
    }).trim();
}

function runParsed(args) {
    return JSON.parse(run(args));
}

let passed = 0;
let failed = 0;

function test(name, fn) {
    try {
        fn();
        passed++;
        console.log(`  PASS: ${name}`);
    } catch (err) {
        failed++;
        console.error(`  FAIL: ${name}`);
        console.error(`    ${err.message}`);
    }
}

// ---- Tests ----

console.log('\n=== State Manager Tests ===\n');

setup();

// -- read command --
console.log('read:');

test('read project returns default state when file missing', () => {
    const data = runParsed(['read', 'project']);
    assert.strictEqual(data.schemaVersion, 1);
    assert.ok(Array.isArray(data.risks), 'risks should be array');
    assert.ok(Array.isArray(data.coverageGaps), 'coverageGaps should be array');
    assert.ok(data.historicalFindings, 'historicalFindings should exist');
});

test('read session returns default state when file missing', () => {
    const data = runParsed(['read', 'session']);
    assert.strictEqual(data.schemaVersion, 1);
    assert.strictEqual(data.featureUnderTest, null);
    assert.ok(Array.isArray(data.findings), 'findings should be array');
    assert.ok(Array.isArray(data.skillHistory), 'skillHistory should be array');
});

test('read project with key returns specific field', () => {
    // First write some data
    run(['write', 'project', 'risks', '[{"area":"auth"}]']);
    const data = runParsed(['read', 'project', 'risks']);
    assert.ok(Array.isArray(data), 'should return array');
    assert.strictEqual(data[0].area, 'auth');
});

test('read session with key returns specific field', () => {
    run(['write', 'session', 'featureUnderTest', '"login flow"']);
    const data = runParsed(['read', 'session', 'featureUnderTest']);
    assert.strictEqual(data, 'login flow');
});

// -- write command --
console.log('\nwrite:');

// Clean up for write tests
setup();

test('write session scalar field', () => {
    const data = runParsed(['write', 'session', 'featureUnderTest', '"login"']);
    assert.strictEqual(data.featureUnderTest, 'login');
});

test('write session appends to findings array', () => {
    const data1 = runParsed(['write', 'session', 'findings', '{"type":"bug","area":"auth","description":"missing validation"}']);
    assert.strictEqual(data1.findings.length, 1);
    assert.strictEqual(data1.findings[0].type, 'bug');

    const data2 = runParsed(['write', 'session', 'findings', '{"type":"risk","area":"api","description":"no rate limiting"}']);
    assert.strictEqual(data2.findings.length, 2);
});

test('write project replaces array field', () => {
    const data = runParsed(['write', 'project', 'risks', '[{"area":"auth","severity":"high"}]']);
    assert.strictEqual(data.risks.length, 1);
    assert.strictEqual(data.risks[0].area, 'auth');

    // Writing again replaces
    const data2 = runParsed(['write', 'project', 'risks', '[{"area":"db","severity":"low"}]']);
    assert.strictEqual(data2.risks.length, 1);
    assert.strictEqual(data2.risks[0].area, 'db');
});

// -- merge command --
console.log('\nmerge:');

setup();

test('merge appends new item to empty array', () => {
    const data = runParsed(['merge', 'project', 'risks', '{"area":"auth","severity":"high","description":"weak passwords"}']);
    assert.strictEqual(data.risks.length, 1);
    assert.strictEqual(data.risks[0].area, 'auth');
    assert.strictEqual(data.risks[0].count, 1);
});

test('merge updates existing item by key (area)', () => {
    const data = runParsed(['merge', 'project', 'risks', '{"area":"auth","severity":"critical","description":"updated"}']);
    assert.strictEqual(data.risks.length, 1, 'should still have 1 item (deduplicated)');
    assert.strictEqual(data.risks[0].severity, 'critical', 'severity should be updated');
    assert.strictEqual(data.risks[0].count, 2, 'count should be incremented');
    assert.ok(data.risks[0].lastSeen, 'lastSeen should be set');
});

test('merge appends different key as new item', () => {
    const data = runParsed(['merge', 'project', 'risks', '{"area":"database","severity":"medium","description":"no indexes"}']);
    assert.strictEqual(data.risks.length, 2, 'should have 2 items');
});

// -- init command --
console.log('\ninit:');

setup();

test('init session creates fresh default session', () => {
    const data = runParsed(['init', 'session']);
    assert.strictEqual(data.schemaVersion, 1);
    assert.strictEqual(data.featureUnderTest, null);
    assert.ok(Array.isArray(data.findings));
});

test('init session archives existing session with content', () => {
    // Write some session data first
    run(['write', 'session', 'featureUnderTest', '"test feature"']);
    run(['write', 'session', 'findings', '{"type":"bug","area":"auth"}']);

    // Init should archive and reset
    const data = runParsed(['init', 'session']);
    assert.strictEqual(data.featureUnderTest, null, 'session should be reset');

    // Check archive was created
    assert.ok(fs.existsSync(SESSIONS_DIR), 'sessions dir should exist');
    const archives = fs.readdirSync(SESSIONS_DIR);
    assert.ok(archives.length >= 1, 'should have at least one archive');
});

// -- archive command --
console.log('\narchive:');

setup();

test('archive session creates timestamped file', () => {
    run(['write', 'session', 'featureUnderTest', '"archive test"']);
    const output = run(['archive', 'session']);
    // Output should contain the archive path
    assert.ok(output.includes('sessions/'), 'should output archive path');

    assert.ok(fs.existsSync(SESSIONS_DIR), 'sessions dir should exist');
    const archives = fs.readdirSync(SESSIONS_DIR);
    assert.ok(archives.length >= 1, 'should have archive file');
    assert.ok(archives[0].endsWith('.json'), 'archive should be .json');
});

// -- schema validation --
console.log('\nschema validation:');

setup();

test('read returns default on invalid schema version', () => {
    fs.mkdirSync(QA_DIR, { recursive: true });
    fs.writeFileSync(PROJECT_STATE, JSON.stringify({ schemaVersion: 999, risks: ['old'] }));
    const data = runParsed(['read', 'project']);
    assert.strictEqual(data.schemaVersion, 1, 'should return default schema');
    assert.deepStrictEqual(data.risks, [], 'should have empty default risks');
});

test('read returns default on missing schema version', () => {
    fs.mkdirSync(QA_DIR, { recursive: true });
    fs.writeFileSync(PROJECT_STATE, JSON.stringify({ risks: ['old'] }));
    const data = runParsed(['read', 'project']);
    assert.strictEqual(data.schemaVersion, 1);
});

// -- atomic writes --
console.log('\natomic writes:');

setup();

test('writes use atomic pattern (no .tmp files left behind)', () => {
    run(['write', 'session', 'featureUnderTest', '"atomic test"']);
    const files = fs.readdirSync(QA_DIR);
    const tmpFiles = files.filter(f => f.endsWith('.tmp'));
    assert.strictEqual(tmpFiles.length, 0, 'no .tmp files should remain');
});

// -- error handling --
console.log('\nerror handling:');

test('unknown command exits with error', () => {
    try {
        execFileSync('node', [SCRIPT, 'foobar'], {
            cwd: TEST_DIR,
            env: { ...process.env, CLAUDE_PLUGIN_ROOT: TEST_DIR },
            encoding: 'utf8',
            timeout: 5000,
        });
        assert.fail('should have thrown');
    } catch (err) {
        assert.ok(err.status !== 0, 'should exit with non-zero');
        assert.ok(err.stderr.includes('Unknown command'), 'should mention unknown command');
    }
});

// -- cleanup --
teardown();

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
process.exit(failed > 0 ? 1 : 0);
