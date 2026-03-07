const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'state-manager.js');

let tmpDir;
let qaDir;
let sessionsDir;

function setup() {
    if (fs.existsSync(tmpDir)) {
        fs.rmSync(tmpDir, { recursive: true });
    }
    fs.mkdirSync(tmpDir, { recursive: true });
    fs.copyFileSync(
        path.join(__dirname, '..', 'settings.json'),
        path.join(tmpDir, 'settings.json')
    );
    qaDir = path.join(tmpDir, 'qa-artifacts');
    sessionsDir = path.join(qaDir, 'sessions');
}

function run(args) {
    return execFileSync('node', [SCRIPT, ...args], {
        cwd: tmpDir,
        env: { ...process.env, CLAUDE_PLUGIN_ROOT: tmpDir },
        encoding: 'utf8',
        timeout: 5000,
    }).trim();
}

function runParsed(args) {
    return JSON.parse(run(args));
}

describe('state-manager.js', () => {
    before(() => {
        tmpDir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'qa-toolkit-sm-test-'));
        setup();
    });

    after(() => {
        if (fs.existsSync(tmpDir)) {
            fs.rmSync(tmpDir, { recursive: true, force: true });
        }
    });

    describe('read', () => {
        beforeEach(() => setup());

        it('returns default project state when file missing', () => {
            const data = runParsed(['read', 'project']);
            assert.equal(data.schemaVersion, 1);
            assert.ok(Array.isArray(data.risks));
            assert.ok(Array.isArray(data.coverageGaps));
            assert.ok(data.historicalFindings);
        });

        it('returns default session state when file missing', () => {
            const data = runParsed(['read', 'session']);
            assert.equal(data.schemaVersion, 1);
            assert.equal(data.featureUnderTest, null);
            assert.ok(Array.isArray(data.findings));
            assert.ok(Array.isArray(data.skillHistory));
        });

        it('returns specific project field by key', () => {
            run(['write', 'project', 'risks', '[{"area":"auth"}]']);
            const data = runParsed(['read', 'project', 'risks']);
            assert.ok(Array.isArray(data));
            assert.equal(data[0].area, 'auth');
        });

        it('returns specific session field by key', () => {
            run(['write', 'session', 'featureUnderTest', '"login flow"']);
            const data = runParsed(['read', 'session', 'featureUnderTest']);
            assert.equal(data, 'login flow');
        });
    });

    describe('write', () => {
        beforeEach(() => setup());

        it('writes session scalar field', () => {
            const data = runParsed(['write', 'session', 'featureUnderTest', '"login"']);
            assert.equal(data.featureUnderTest, 'login');
        });

        it('appends to session findings array', () => {
            const data1 = runParsed(['write', 'session', 'findings', '{"type":"bug","area":"auth","description":"missing validation"}']);
            assert.equal(data1.findings.length, 1);
            assert.equal(data1.findings[0].type, 'bug');

            const data2 = runParsed(['write', 'session', 'findings', '{"type":"risk","area":"api","description":"no rate limiting"}']);
            assert.equal(data2.findings.length, 2);
        });

        it('replaces project array field', () => {
            const data = runParsed(['write', 'project', 'risks', '[{"area":"auth","severity":"high"}]']);
            assert.equal(data.risks.length, 1);
            assert.equal(data.risks[0].area, 'auth');

            const data2 = runParsed(['write', 'project', 'risks', '[{"area":"db","severity":"low"}]']);
            assert.equal(data2.risks.length, 1);
            assert.equal(data2.risks[0].area, 'db');
        });
    });

    describe('merge', () => {
        beforeEach(() => setup());

        it('appends new item to empty array', () => {
            const data = runParsed(['merge', 'project', 'risks', '{"area":"auth","severity":"high","description":"weak passwords"}']);
            assert.equal(data.risks.length, 1);
            assert.equal(data.risks[0].area, 'auth');
            assert.equal(data.risks[0].count, 1);
        });

        it('updates existing item by key (area)', () => {
            runParsed(['merge', 'project', 'risks', '{"area":"auth","severity":"high"}']);
            const data = runParsed(['merge', 'project', 'risks', '{"area":"auth","severity":"critical","description":"updated"}']);
            assert.equal(data.risks.length, 1, 'should still have 1 item (deduplicated)');
            assert.equal(data.risks[0].severity, 'critical');
            assert.equal(data.risks[0].count, 2);
            assert.ok(data.risks[0].lastSeen);
        });

        it('appends different key as new item', () => {
            runParsed(['merge', 'project', 'risks', '{"area":"auth","severity":"high"}']);
            const data = runParsed(['merge', 'project', 'risks', '{"area":"database","severity":"medium","description":"no indexes"}']);
            assert.equal(data.risks.length, 2);
        });
    });

    describe('init', () => {
        beforeEach(() => setup());

        it('creates fresh default session', () => {
            const data = runParsed(['init', 'session']);
            assert.equal(data.schemaVersion, 1);
            assert.equal(data.featureUnderTest, null);
            assert.ok(Array.isArray(data.findings));
        });

        it('archives existing session with content', () => {
            run(['write', 'session', 'featureUnderTest', '"test feature"']);
            run(['write', 'session', 'findings', '{"type":"bug","area":"auth"}']);

            const data = runParsed(['init', 'session']);
            assert.equal(data.featureUnderTest, null, 'session should be reset');

            assert.ok(fs.existsSync(sessionsDir), 'sessions dir should exist');
            const archives = fs.readdirSync(sessionsDir);
            assert.ok(archives.length >= 1, 'should have at least one archive');
        });
    });

    describe('archive', () => {
        beforeEach(() => setup());

        it('creates timestamped file', () => {
            run(['write', 'session', 'featureUnderTest', '"archive test"']);
            const output = run(['archive', 'session']);
            assert.ok(output.includes('sessions/'));

            assert.ok(fs.existsSync(sessionsDir));
            const archives = fs.readdirSync(sessionsDir);
            assert.ok(archives.length >= 1);
            assert.ok(archives[0].endsWith('.json'));
        });
    });

    describe('schema validation', () => {
        beforeEach(() => setup());

        it('returns default on invalid schema version', () => {
            fs.mkdirSync(qaDir, { recursive: true });
            fs.writeFileSync(path.join(qaDir, '.qa-context.json'), JSON.stringify({ schemaVersion: 999, risks: ['old'] }));
            const data = runParsed(['read', 'project']);
            assert.equal(data.schemaVersion, 1);
            assert.deepEqual(data.risks, []);
        });

        it('returns default on missing schema version', () => {
            fs.mkdirSync(qaDir, { recursive: true });
            fs.writeFileSync(path.join(qaDir, '.qa-context.json'), JSON.stringify({ risks: ['old'] }));
            const data = runParsed(['read', 'project']);
            assert.equal(data.schemaVersion, 1);
        });
    });

    describe('atomic writes', () => {
        beforeEach(() => setup());

        it('leaves no .tmp files behind', () => {
            run(['write', 'session', 'featureUnderTest', '"atomic test"']);
            const files = fs.readdirSync(qaDir);
            const tmpFiles = files.filter(f => f.endsWith('.tmp'));
            assert.equal(tmpFiles.length, 0);
        });
    });

    describe('error handling', () => {
        it('exits with error on unknown command', () => {
            try {
                execFileSync('node', [SCRIPT, 'foobar'], {
                    cwd: tmpDir,
                    env: { ...process.env, CLAUDE_PLUGIN_ROOT: tmpDir },
                    encoding: 'utf8',
                    timeout: 5000,
                });
                assert.fail('should have thrown');
            } catch (err) {
                assert.ok(err.status !== 0);
                assert.ok(err.stderr.includes('Unknown command'));
            }
        });
    });
});
