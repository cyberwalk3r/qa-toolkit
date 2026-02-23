const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const scriptPath = path.join(__dirname, '..', 'scripts', 'save-artifact.js');
const pluginRoot = path.join(__dirname, '..');

function runSaveArtifact(cwd) {
    return execFileSync('node', [scriptPath], {
        cwd,
        env: { ...process.env, CLAUDE_PLUGIN_ROOT: pluginRoot },
        encoding: 'utf8',
    });
}

describe('save-artifact.js', () => {
    let tmpDir;

    before(() => {
        tmpDir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'qa-toolkit-save-test-'));
    });

    after(() => {
        fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('creates activity log file', () => {
        const projectDir = path.join(tmpDir, 'log-project');
        fs.mkdirSync(projectDir, { recursive: true });

        runSaveArtifact(projectDir);

        const logPath = path.join(projectDir, 'qa-artifacts', '.qa-activity.log');
        assert.ok(fs.existsSync(logPath));
    });

    it('logs timestamp and artifact info', () => {
        const projectDir = path.join(tmpDir, 'log-content');
        fs.mkdirSync(projectDir, { recursive: true });

        runSaveArtifact(projectDir);

        const logPath = path.join(projectDir, 'qa-artifacts', '.qa-activity.log');
        const content = fs.readFileSync(logPath, 'utf8');
        assert.ok(content.includes('Task completed'));
        assert.ok(content.includes('Artifacts:'));
    });

    it('detects recently modified artifacts', () => {
        const projectDir = path.join(tmpDir, 'recent-artifacts');
        const bugDir = path.join(projectDir, 'qa-artifacts', 'bug-reports');
        fs.mkdirSync(bugDir, { recursive: true });
        fs.writeFileSync(path.join(bugDir, 'bug-2026-02-23-test.md'), '# Bug');

        runSaveArtifact(projectDir);

        const logPath = path.join(projectDir, 'qa-artifacts', '.qa-activity.log');
        const content = fs.readFileSync(logPath, 'utf8');
        assert.ok(content.includes('bug-reports/bug-2026-02-23-test.md'));
    });

    it('reports no artifacts when none are recent', () => {
        const projectDir = path.join(tmpDir, 'no-artifacts');
        fs.mkdirSync(projectDir, { recursive: true });

        runSaveArtifact(projectDir);

        const logPath = path.join(projectDir, 'qa-artifacts', '.qa-activity.log');
        const content = fs.readFileSync(logPath, 'utf8');
        assert.ok(content.includes('(no new artifacts detected)'));
    });

    it('appends to existing log', () => {
        const projectDir = path.join(tmpDir, 'append-log');
        fs.mkdirSync(projectDir, { recursive: true });

        runSaveArtifact(projectDir);
        runSaveArtifact(projectDir);

        const logPath = path.join(projectDir, 'qa-artifacts', '.qa-activity.log');
        const content = fs.readFileSync(logPath, 'utf8');
        const lines = content.trim().split('\n');
        assert.equal(lines.length, 2);
    });
});
