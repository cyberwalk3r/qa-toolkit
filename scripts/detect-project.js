#!/usr/bin/env node

/**
 * QA Toolkit — Project Auto-Detection Script
 * 
 * Runs on SessionStart to detect project tech stack, test frameworks,
 * CI/CD setup, and existing QA configuration. Outputs detected context
 * to stdout (injected into Claude's session context).
 * 
 * Saves config to qa-artifacts/.qa-config.json for persistence.
 */

const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();

// Read plugin settings
const pluginRoot = process.env.CLAUDE_PLUGIN_ROOT || path.join(__dirname, '..');
let outputDir = 'qa-artifacts';
try {
    const settings = JSON.parse(fs.readFileSync(path.join(pluginRoot, 'settings.json'), 'utf8'));
    if (settings.outputDir) {
        if (path.isAbsolute(settings.outputDir) || settings.outputDir.includes('..')) {
            console.error('Error: outputDir must be a relative path without ".." components');
            process.exit(1);
        }
        outputDir = settings.outputDir;
    }
    if (settings.hooksEnabled === false) process.exit(0);
} catch { /* use default */ }

const configDir = path.join(projectRoot, outputDir);
const configPath = path.join(configDir, '.qa-config.json');

// If config already exists and is recent (< 24h), just output it
if (fs.existsSync(configPath)) {
    const stat = fs.statSync(configPath);
    const ageHours = (Date.now() - stat.mtimeMs) / (1000 * 60 * 60);
    if (ageHours < 24) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        outputContext(config);
        process.exit(0);
    }
}

// Detection markers
const detectors = {
    languages: [
        { marker: 'package.json', lang: 'JavaScript/TypeScript' },
        { marker: 'tsconfig.json', lang: 'TypeScript' },
        { marker: 'requirements.txt', lang: 'Python' },
        { marker: 'pyproject.toml', lang: 'Python' },
        { marker: 'setup.py', lang: 'Python' },
        { marker: 'Pipfile', lang: 'Python' },
        { marker: 'go.mod', lang: 'Go' },
        { marker: 'Cargo.toml', lang: 'Rust' },
        { marker: 'pom.xml', lang: 'Java' },
        { marker: 'build.gradle', lang: 'Java/Kotlin' },
        { marker: 'build.gradle.kts', lang: 'Kotlin' },
        { marker: '*.csproj', lang: 'C#/.NET', glob: true },
        { marker: '*.sln', lang: 'C#/.NET', glob: true },
        { marker: 'Gemfile', lang: 'Ruby' },
        { marker: 'composer.json', lang: 'PHP' },
        { marker: 'mix.exs', lang: 'Elixir' },
        { marker: 'Package.swift', lang: 'Swift' },
        { marker: 'pubspec.yaml', lang: 'Dart/Flutter' },
    ],
    cicd: [
        { marker: '.github/workflows', name: 'GitHub Actions', isDir: true },
        { marker: '.gitlab-ci.yml', name: 'GitLab CI' },
        { marker: 'Jenkinsfile', name: 'Jenkins' },
        { marker: 'azure-pipelines.yml', name: 'Azure Pipelines' },
        { marker: '.circleci', name: 'CircleCI', isDir: true },
        { marker: 'bitbucket-pipelines.yml', name: 'Bitbucket Pipelines' },
        { marker: '.travis.yml', name: 'Travis CI' },
        { marker: 'Dockerfile', name: 'Docker' },
        { marker: 'docker-compose.yml', name: 'Docker Compose' },
        { marker: 'docker-compose.yaml', name: 'Docker Compose' },
    ],
    packageManagers: [
        { marker: 'pnpm-lock.yaml', name: 'pnpm' },
        { marker: 'yarn.lock', name: 'Yarn' },
        { marker: 'package-lock.json', name: 'npm' },
        { marker: 'bun.lockb', name: 'Bun' },
        { marker: 'Pipfile.lock', name: 'Pipenv' },
        { marker: 'poetry.lock', name: 'Poetry' },
        { marker: 'uv.lock', name: 'uv' },
    ],
};

function fileExists(name) {
    return fs.existsSync(path.join(projectRoot, name));
}

function dirExists(name) {
    const p = path.join(projectRoot, name);
    return fs.existsSync(p) && fs.statSync(p).isDirectory();
}

// Scan immediate subdirectories for marker files (monorepo support)
function getSubdirs() {
    try {
        return fs.readdirSync(projectRoot, { withFileTypes: true })
            .filter(e => e.isDirectory() && !e.name.startsWith('.') && e.name !== 'node_modules' && e.name !== outputDir)
            .map(e => e.name);
    } catch { return []; }
}

function findFileInSubdirs(name) {
    if (fileExists(name)) return path.join(projectRoot, name);
    for (const sub of getSubdirs()) {
        const p = path.join(projectRoot, sub, name);
        if (fs.existsSync(p)) return p;
    }
    return null;
}

function findAllInSubdirs(name) {
    const results = [];
    if (fileExists(name)) results.push(path.join(projectRoot, name));
    for (const sub of getSubdirs()) {
        const p = path.join(projectRoot, sub, name);
        if (fs.existsSync(p)) results.push(p);
    }
    return results;
}

function hasGlobMatch(pattern) {
    const ext = pattern.replace('*', '');
    function search(dir, depth) {
        if (depth > 3) return false;
        try {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
                if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
                if (entry.isFile() && entry.name.endsWith(ext)) return true;
                if (entry.isDirectory() && search(path.join(dir, entry.name), depth + 1)) return true;
            }
        } catch { /* skip unreadable dirs */ }
        return false;
    }
    return search(projectRoot, 0);
}

// Detect everything
const config = {
    detectedAt: new Date().toISOString(),
    projectRoot,
    outputDir,
    languages: [],
    frameworks: [],
    testFrameworks: [],
    cicd: [],
    packageManager: null,
    // Existing project documentation
    hasClaudeMd: fileExists('CLAUDE.md'),
    hasReadme: fileExists('README.md'),
    existingDocs: [],
    existingQaConfig: {},
};

// Detect existing documentation directories and files
const docMarkers = [
    { path: 'docs', isDir: true, type: 'docs' },
    { path: 'documentation', isDir: true, type: 'docs' },
    { path: 'wiki', isDir: true, type: 'wiki' },
    { path: '.github', isDir: true, type: 'github-config' },
    { path: 'CLAUDE.md', isDir: false, type: 'claude-md' },
    { path: 'CONTRIBUTING.md', isDir: false, type: 'contributing' },
    { path: 'API.md', isDir: false, type: 'api-docs' },
    { path: 'ARCHITECTURE.md', isDir: false, type: 'architecture' },
    { path: 'TESTING.md', isDir: false, type: 'testing-guide' },
    { path: 'QA.md', isDir: false, type: 'qa-guide' },
    { path: '.github/PULL_REQUEST_TEMPLATE.md', isDir: false, type: 'pr-template' },
    { path: '.github/ISSUE_TEMPLATE', isDir: true, type: 'issue-templates' },
    { path: 'openapi.yaml', isDir: false, type: 'openapi-spec' },
    { path: 'openapi.json', isDir: false, type: 'openapi-spec' },
    { path: 'swagger.yaml', isDir: false, type: 'openapi-spec' },
    { path: 'swagger.json', isDir: false, type: 'openapi-spec' },
];

for (const d of docMarkers) {
    const exists = d.isDir ? dirExists(d.path) : fileExists(d.path);
    if (exists) config.existingDocs.push({ path: d.path, type: d.type });
}

// Read CLAUDE.md summary if it exists (first 50 lines for context)
if (config.hasClaudeMd) {
    try {
        const content = fs.readFileSync(path.join(projectRoot, 'CLAUDE.md'), 'utf8');
        const lines = content.split('\n').slice(0, 50);
        config.existingQaConfig.claudeMdSummary = lines.join('\n');
    } catch { }
}

// Check for existing test directories (root + subdirs)
const testDirMarkers = ['__tests__', 'tests', 'test', 'spec', 'specs', 'e2e', 'integration-tests'];
const foundTestDirs = new Set();
for (const d of testDirMarkers) {
    if (dirExists(d)) foundTestDirs.add(d);
    for (const sub of getSubdirs()) {
        if (dirExists(path.join(sub, d))) foundTestDirs.add(`${sub}/${d}`);
    }
}
config.existingTestDirs = [...foundTestDirs];

// Languages (search root + immediate subdirectories for monorepo support)
for (const d of detectors.languages) {
    const found = d.glob ? hasGlobMatch(d.marker) : findFileInSubdirs(d.marker);
    if (found) {
        if (!config.languages.includes(d.lang)) config.languages.push(d.lang);
    }
}

// Frameworks & test frameworks — proper parsing, not substring matching
function getPackageDeps(absPath) {
    try {
        const raw = fs.readFileSync(absPath, 'utf8');
        const pkg = JSON.parse(raw);
        const allDeps = {
            ...pkg.dependencies,
            ...pkg.devDependencies,
            ...pkg.peerDependencies,
        };
        return Object.keys(allDeps || {}).map(k => k.toLowerCase());
    } catch { return []; }
}

function getPythonDeps(absPath) {
    try {
        const content = fs.readFileSync(absPath, 'utf8');
        return content.split('\n')
            .map(line => line.trim().split(/[=<>!~\[;#]/)[0].trim().toLowerCase())
            .filter(Boolean);
    } catch { return []; }
}

// Aggregate deps from root + subdirectories (monorepo support)
const jsDeps = findAllInSubdirs('package.json').flatMap(p => getPackageDeps(p));
const pyDeps = [
    ...findAllInSubdirs('requirements.txt').flatMap(p => getPythonDeps(p)),
    ...findAllInSubdirs('requirements-dev.txt').flatMap(p => getPythonDeps(p)),
];

// Check pyproject.toml dependencies — section-aware parsing (root + subdirs)
for (const pyprojectPath of findAllInSubdirs('pyproject.toml')) {
    try {
        const pyproject = fs.readFileSync(pyprojectPath, 'utf8');
        const lines = pyproject.split('\n');
        let inDepSection = false;
        const depSections = [
            '[project.dependencies]',
            '[project.optional-dependencies',
            '[tool.poetry.dependencies]',
            '[tool.poetry.dev-dependencies]',
            '[tool.poetry.group.',
        ];
        for (const line of lines) {
            const trimmed = line.trim().toLowerCase();
            if (trimmed.startsWith('[')) {
                inDepSection = depSections.some(s => trimmed.startsWith(s));
                continue;
            }
            if (inDepSection && trimmed && !trimmed.startsWith('#')) {
                const match = trimmed.match(/^["']?([a-z0-9_-]+)/);
                if (match) pyDeps.push(match[1]);
            }
        }
    } catch { }
}

const frameworkChecks = [
    { deps: jsDeps, key: 'react', name: 'React', exclude: ['react-native'] },
    { deps: jsDeps, key: 'next', name: 'Next.js' },
    { deps: jsDeps, key: 'vue', name: 'Vue.js' },
    { deps: jsDeps, key: 'nuxt', name: 'Nuxt' },
    { deps: jsDeps, key: '@angular/core', name: 'Angular' },
    { deps: jsDeps, key: 'svelte', name: 'Svelte' },
    { deps: jsDeps, key: 'express', name: 'Express.js' },
    { deps: jsDeps, key: 'fastify', name: 'Fastify' },
    { deps: jsDeps, key: '@nestjs/core', name: 'NestJS' },
    { deps: pyDeps, key: 'django', name: 'Django' },
    { deps: pyDeps, key: 'flask', name: 'Flask' },
    { deps: pyDeps, key: 'fastapi', name: 'FastAPI' },
];

for (const f of frameworkChecks) {
    if (f.deps.includes(f.key)) {
        if (f.exclude && f.exclude.some(ex => f.deps.includes(ex))) continue;
        if (!config.frameworks.includes(f.name)) config.frameworks.push(f.name);
    }
}

const testChecks = [
    { deps: jsDeps, key: 'jest', name: 'Jest' },
    { deps: jsDeps, key: 'vitest', name: 'Vitest' },
    { deps: jsDeps, key: 'mocha', name: 'Mocha' },
    { deps: jsDeps, key: '@playwright/test', name: 'Playwright' },
    { deps: jsDeps, key: 'cypress', name: 'Cypress' },
    { deps: jsDeps, key: '@testing-library/react', name: 'Testing Library' },
    { deps: jsDeps, key: '@testing-library/vue', name: 'Testing Library' },
    { deps: pyDeps, key: 'pytest', name: 'Pytest' },
    { deps: pyDeps, key: 'selenium', name: 'Selenium' },
];

for (const t of testChecks) {
    if (t.deps.includes(t.key) && !config.testFrameworks.includes(t.name)) {
        config.testFrameworks.push(t.name);
    }
}

// Also check marker files for test frameworks
const testMarkerFiles = [
    { marker: 'pytest.ini', name: 'Pytest' },
    { marker: 'jest.config.js', name: 'Jest' },
    { marker: 'jest.config.ts', name: 'Jest' },
    { marker: 'vitest.config.ts', name: 'Vitest' },
    { marker: 'vitest.config.js', name: 'Vitest' },
    { marker: 'playwright.config.ts', name: 'Playwright' },
    { marker: 'playwright.config.js', name: 'Playwright' },
    { marker: 'cypress.config.js', name: 'Cypress' },
    { marker: 'cypress.config.ts', name: 'Cypress' },
];

for (const m of testMarkerFiles) {
    if (findFileInSubdirs(m.marker) && !config.testFrameworks.includes(m.name)) {
        config.testFrameworks.push(m.name);
    }
}

// CI/CD
for (const d of detectors.cicd) {
    if (d.isDir ? dirExists(d.marker) : fileExists(d.marker)) {
        config.cicd.push(d.name);
    }
}

// Package manager (search root + subdirs)
for (const d of detectors.packageManagers) {
    if (findFileInSubdirs(d.marker)) { config.packageManager = d.name; break; }
}

// Save config
if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
}
fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

outputContext(config);

function scanArtifacts() {
    const summary = {};
    const artifactDirs = [
        { dir: 'pr-reviews', label: 'PR reviews' },
        { dir: 'bug-reports', label: 'Bug reports' },
        { dir: 'test-cases', label: 'Test cases' },
        { dir: 'api-tests', label: 'API tests' },
        { dir: 'regression-plans', label: 'Regression plans' },
        { dir: 'test-data', label: 'Test data files' },
        { dir: 'a11y-audits', label: 'Accessibility audits' },
        { dir: 'release-assessments', label: 'Release assessments' },
        { dir: 'e2e-tests', label: 'E2E test scaffolds' },
    ];

    for (const { dir, label } of artifactDirs) {
        const dirPath = path.join(configDir, dir);
        if (!fs.existsSync(dirPath)) continue;
        try {
            const files = fs.readdirSync(dirPath).filter(f => !f.startsWith('.'));
            if (files.length === 0) continue;

            // Find most recent file
            let latestTime = 0;
            for (const file of files) {
                const stat = fs.statSync(path.join(dirPath, file));
                if (stat.mtimeMs > latestTime) latestTime = stat.mtimeMs;
            }

            const latestDate = new Date(latestTime).toISOString().split('T')[0];
            summary[label] = { count: files.length, latest: latestDate, dir };
        } catch { /* skip unreadable */ }
    }
    return summary;
}

function outputContext(cfg) {
    const lines = ['[QA Toolkit — Project Context]'];
    if (cfg.languages.length) lines.push(`Languages: ${cfg.languages.join(', ')}`);
    if (cfg.frameworks.length) lines.push(`Frameworks: ${cfg.frameworks.join(', ')}`);
    if (cfg.testFrameworks.length) lines.push(`Test Frameworks: ${cfg.testFrameworks.join(', ')}`);
    if (cfg.cicd.length) lines.push(`CI/CD: ${cfg.cicd.join(', ')}`);
    if (cfg.packageManager) lines.push(`Package Manager: ${cfg.packageManager}`);
    if (cfg.existingTestDirs?.length) lines.push(`Test Directories: ${cfg.existingTestDirs.join(', ')}`);
    lines.push(`CLAUDE.md: ${cfg.hasClaudeMd ? 'exists (will be read for context)' : 'not found'}`);
    if (cfg.existingDocs?.length) {
        const docTypes = cfg.existingDocs.map(d => d.type).join(', ');
        lines.push(`Existing Docs: ${docTypes}`);
    }
    lines.push(`Config: ${outputDir}/.qa-config.json`);
    lines.push(`Output Directory: ${outputDir}/`);

    // Scan for existing QA work
    const artifacts = scanArtifacts();
    const artifactKeys = Object.keys(artifacts);
    if (artifactKeys.length > 0) {
        lines.push('');
        lines.push('[Previous QA Work]');
        for (const label of artifactKeys) {
            const { count, latest, dir } = artifacts[label];
            lines.push(`  ${label}: ${count} file${count > 1 ? 's' : ''} (latest: ${latest}) → ${outputDir}/${dir}/`);
        }
        lines.push('Read files from these directories for context on previous QA decisions.');
    } else {
        lines.push('No previous QA artifacts found. This appears to be a fresh project.');
    }

    console.log(lines.join('\n'));
}

