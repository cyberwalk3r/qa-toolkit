const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const realPluginRoot = path.join(__dirname, '..');
const detectScript = path.join(realPluginRoot, 'scripts', 'detect-project.js');
const saveScript = path.join(realPluginRoot, 'scripts', 'save-artifact.js');

// Use a temp plugin root with a modified settings.json to avoid mutating the real one
function makeTempPluginRoot(overrides) {
    const tmpPlugin = fs.mkdtempSync(path.join(require('os').tmpdir(), 'qa-toolkit-plugin-'));
    const settings = JSON.parse(fs.readFileSync(path.join(realPluginRoot, 'settings.json'), 'utf8'));
    Object.assign(settings, overrides);
    fs.writeFileSync(path.join(tmpPlugin, 'settings.json'), JSON.stringify(settings, null, 4));
    return tmpPlugin;
}

describe('hooksEnabled toggle', () => {
    let tmpDir;
    const cleanups = [];

    before(() => {
        tmpDir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'qa-toolkit-hooks-test-'));
    });

    after(() => {
        fs.rmSync(tmpDir, { recursive: true, force: true });
        for (const dir of cleanups) {
            fs.rmSync(dir, { recursive: true, force: true });
        }
    });

    it('detect-project.js exits silently when hooksEnabled is false', () => {
        const projectDir = path.join(tmpDir, 'disabled-detect');
        fs.mkdirSync(projectDir, { recursive: true });
        const fakePluginRoot = makeTempPluginRoot({ hooksEnabled: false });
        cleanups.push(fakePluginRoot);

        const stdout = execFileSync('node', [detectScript], {
            cwd: projectDir,
            env: { ...process.env, CLAUDE_PLUGIN_ROOT: fakePluginRoot },
            encoding: 'utf8',
        });

        assert.equal(stdout, '');
        assert.ok(!fs.existsSync(path.join(projectDir, 'qa-artifacts')));
    });

    it('save-artifact.js exits silently when hooksEnabled is false', () => {
        const projectDir = path.join(tmpDir, 'disabled-save');
        fs.mkdirSync(projectDir, { recursive: true });
        const fakePluginRoot = makeTempPluginRoot({ hooksEnabled: false });
        cleanups.push(fakePluginRoot);

        const stdout = execFileSync('node', [saveScript], {
            cwd: projectDir,
            env: { ...process.env, CLAUDE_PLUGIN_ROOT: fakePluginRoot },
            encoding: 'utf8',
        });

        assert.equal(stdout, '');
        assert.ok(!fs.existsSync(path.join(projectDir, 'qa-artifacts')));
    });

    it('detect-project.js rejects outputDir with path traversal', () => {
        const projectDir = path.join(tmpDir, 'traversal-detect');
        fs.mkdirSync(projectDir, { recursive: true });
        const fakePluginRoot = makeTempPluginRoot({ outputDir: '../etc' });
        cleanups.push(fakePluginRoot);

        try {
            execFileSync('node', [detectScript], {
                cwd: projectDir,
                env: { ...process.env, CLAUDE_PLUGIN_ROOT: fakePluginRoot },
                encoding: 'utf8',
            });
            assert.fail('Expected script to exit with non-zero code');
        } catch (err) {
            assert.equal(err.status, 1);
            assert.ok(err.stderr.includes('outputDir must be a relative path'));
        }
    });

    it('save-artifact.js rejects absolute outputDir', () => {
        const projectDir = path.join(tmpDir, 'abs-save');
        fs.mkdirSync(projectDir, { recursive: true });
        const fakePluginRoot = makeTempPluginRoot({ outputDir: '/tmp/evil' });
        cleanups.push(fakePluginRoot);

        try {
            execFileSync('node', [saveScript], {
                cwd: projectDir,
                env: { ...process.env, CLAUDE_PLUGIN_ROOT: fakePluginRoot },
                encoding: 'utf8',
            });
            assert.fail('Expected script to exit with non-zero code');
        } catch (err) {
            assert.equal(err.status, 1);
            assert.ok(err.stderr.includes('outputDir must be a relative path'));
        }
    });

    it('scripts run normally when hooksEnabled is true', () => {
        const projectDir = path.join(tmpDir, 'enabled');
        fs.mkdirSync(projectDir, { recursive: true });

        const stdout = execFileSync('node', [detectScript], {
            cwd: projectDir,
            env: { ...process.env, CLAUDE_PLUGIN_ROOT: realPluginRoot },
            encoding: 'utf8',
        });

        assert.ok(stdout.includes('[QA Toolkit — Project Context]'));
        assert.ok(fs.existsSync(path.join(projectDir, 'qa-artifacts', '.qa-config.json')));
    });
});
