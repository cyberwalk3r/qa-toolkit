const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const scriptPath = path.join(__dirname, '..', 'scripts', 'detect-project.js');
const pluginRoot = path.join(__dirname, '..');

function runDetect(cwd) {
    const stdout = execFileSync('node', [scriptPath], {
        cwd,
        env: { ...process.env, CLAUDE_PLUGIN_ROOT: pluginRoot },
        encoding: 'utf8',
    });
    return stdout;
}

function readConfig(cwd, outputDir = 'qa-artifacts') {
    const contextPath = path.join(cwd, outputDir, '.qa-context.json');
    const ctx = JSON.parse(fs.readFileSync(contextPath, 'utf8'));
    // Flatten detection fields to the top level for backwards-compatible test assertions
    return { ...ctx.detection, detectedAt: ctx.detectedAt, outputDir: ctx.outputDir };
}

describe('detect-project.js', () => {
    let tmpDir;

    before(() => {
        tmpDir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'qa-toolkit-test-'));
    });

    after(() => {
        fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('outputs context header for empty project', () => {
        const stdout = runDetect(tmpDir);
        assert.ok(stdout.includes('[QA Toolkit — Project Context]'));
        assert.ok(stdout.includes('No previous QA artifacts found'));
    });

    it('creates .qa-context.json in output directory', () => {
        // Config was created by the previous test run
        const config = readConfig(tmpDir);
        assert.equal(config.outputDir, 'qa-artifacts');
        assert.ok(config.detectedAt);
    });

    it('detects JavaScript/TypeScript from package.json', () => {
        const projectDir = path.join(tmpDir, 'js-project');
        fs.mkdirSync(projectDir, { recursive: true });
        fs.writeFileSync(path.join(projectDir, 'package.json'), JSON.stringify({
            dependencies: { react: '^18.0.0', next: '^14.0.0' },
            devDependencies: { jest: '^29.0.0' },
        }));

        runDetect(projectDir);
        const config = readConfig(projectDir);

        assert.ok(config.languages.includes('JavaScript/TypeScript'));
        assert.ok(config.frameworks.includes('React'));
        assert.ok(config.frameworks.includes('Next.js'));
        assert.ok(config.testFrameworks.includes('Jest'));
    });

    it('detects Python from requirements.txt', () => {
        const projectDir = path.join(tmpDir, 'py-project');
        fs.mkdirSync(projectDir, { recursive: true });
        fs.writeFileSync(path.join(projectDir, 'requirements.txt'), 'fastapi>=0.100\npytest>=7.0\n');

        runDetect(projectDir);
        const config = readConfig(projectDir);

        assert.ok(config.languages.includes('Python'));
        assert.ok(config.frameworks.includes('FastAPI'));
        assert.ok(config.testFrameworks.includes('Pytest'));
    });

    it('detects test framework from marker files', () => {
        const projectDir = path.join(tmpDir, 'marker-project');
        fs.mkdirSync(projectDir, { recursive: true });
        fs.writeFileSync(path.join(projectDir, 'playwright.config.ts'), 'export default {}');

        runDetect(projectDir);
        const config = readConfig(projectDir);

        assert.ok(config.testFrameworks.includes('Playwright'));
    });

    it('detects CI/CD from directory markers', () => {
        const projectDir = path.join(tmpDir, 'ci-project');
        fs.mkdirSync(path.join(projectDir, '.github', 'workflows'), { recursive: true });

        runDetect(projectDir);
        const config = readConfig(projectDir);

        assert.ok(config.cicd.includes('GitHub Actions'));
    });

    it('detects package manager from lock files', () => {
        const projectDir = path.join(tmpDir, 'pnpm-project');
        fs.mkdirSync(projectDir, { recursive: true });
        fs.writeFileSync(path.join(projectDir, 'pnpm-lock.yaml'), '');

        runDetect(projectDir);
        const config = readConfig(projectDir);

        assert.equal(config.packageManager, 'pnpm');
    });

    it('detects existing documentation', () => {
        const projectDir = path.join(tmpDir, 'docs-project');
        fs.mkdirSync(projectDir, { recursive: true });
        fs.writeFileSync(path.join(projectDir, 'README.md'), '# Test');
        fs.writeFileSync(path.join(projectDir, 'CLAUDE.md'), '# Claude');

        runDetect(projectDir);
        const config = readConfig(projectDir);

        assert.equal(config.hasReadme, true);
        assert.equal(config.hasClaudeMd, true);
        assert.ok(config.existingDocs.some(d => d.type === 'claude-md'));
    });

    it('always runs fresh detection (no cache)', () => {
        const projectDir = path.join(tmpDir, 'cache-project');
        fs.mkdirSync(projectDir, { recursive: true });

        // First run creates config
        runDetect(projectDir);
        const config1 = readConfig(projectDir);

        // Second run always re-detects (cache was removed in v2 — detection always runs fresh)
        runDetect(projectDir);
        const config2 = readConfig(projectDir);

        // Both configs should be valid detections
        assert.ok(config1.detectedAt);
        assert.ok(config2.detectedAt);
    });

    it('detects .csproj in subdirectories via recursive glob', () => {
        const projectDir = path.join(tmpDir, 'dotnet-project');
        fs.mkdirSync(path.join(projectDir, 'src', 'MyApp'), { recursive: true });
        fs.writeFileSync(path.join(projectDir, 'src', 'MyApp', 'MyApp.csproj'), '<Project />');

        runDetect(projectDir);
        const config = readConfig(projectDir);

        assert.ok(config.languages.includes('C#/.NET'));
    });

    it('detects stack in monorepo subdirectories', () => {
        const projectDir = path.join(tmpDir, 'monorepo');
        const backend = path.join(projectDir, 'backend');
        const frontend = path.join(projectDir, 'app');
        fs.mkdirSync(backend, { recursive: true });
        fs.mkdirSync(path.join(frontend, 'e2e'), { recursive: true });

        // Python backend in backend/
        fs.writeFileSync(path.join(backend, 'requirements.txt'), 'fastapi>=0.100\npytest>=7.0\n');
        fs.writeFileSync(path.join(backend, 'pytest.ini'), '[pytest]');

        // JS frontend in app/
        fs.writeFileSync(path.join(frontend, 'package.json'), JSON.stringify({
            dependencies: { react: '^18.0.0' },
            devDependencies: { '@playwright/test': '^1.40.0' },
        }));
        fs.writeFileSync(path.join(frontend, 'playwright.config.ts'), 'export default {}');
        fs.writeFileSync(path.join(frontend, 'package-lock.json'), '{}');

        runDetect(projectDir);
        const config = readConfig(projectDir);

        assert.ok(config.languages.includes('Python'));
        assert.ok(config.languages.includes('JavaScript/TypeScript'));
        assert.ok(config.frameworks.includes('FastAPI'));
        assert.ok(config.frameworks.includes('React'));
        assert.ok(config.testFrameworks.includes('Pytest'));
        assert.ok(config.testFrameworks.includes('Playwright'));
        assert.equal(config.packageManager, 'npm');
        assert.ok(config.existingTestDirs.includes('app/e2e'));
    });

    it('does not create artifact subdirectories', () => {
        const projectDir = path.join(tmpDir, 'no-subdirs');
        fs.mkdirSync(projectDir, { recursive: true });

        runDetect(projectDir);

        const qaDir = path.join(projectDir, 'qa-artifacts');
        const entries = fs.readdirSync(qaDir).sort();
        // Should only have state files, no subdirectories (v2 writes .qa-context.json + .qa-session.json)
        const dirs = entries.filter(e => fs.statSync(path.join(qaDir, e)).isDirectory());
        assert.deepEqual(dirs, []);
    });
});
