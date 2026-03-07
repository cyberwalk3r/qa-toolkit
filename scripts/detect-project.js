#!/usr/bin/env node

/**
 * QA Toolkit — Project Auto-Detection Script (State-Aware)
 *
 * Runs on SessionStart to detect project tech stack, test frameworks,
 * CI/CD setup, monorepo workspaces, and coding conventions. Detection
 * is organized into 5 priority-ordered timed phases with a configurable
 * performance budget (default 500ms). Phases that exceed the budget are
 * skipped silently.
 *
 * Merges detection results into .qa-context.json (preserving accumulated
 * QA knowledge) and initializes a fresh session via state-manager.js.
 *
 * Outputs detected context + session status to stdout (injected into
 * Claude's session context).
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const projectRoot = process.cwd();

// Read plugin settings
const pluginRoot = process.env.CLAUDE_PLUGIN_ROOT || path.join(__dirname, '..');
let outputDir = 'qa-artifacts';
let detectionBudgetMs = 500;
try {
    const settings = JSON.parse(fs.readFileSync(path.join(pluginRoot, 'settings.json'), 'utf8'));
    if (settings.outputDir) {
        if (path.isAbsolute(settings.outputDir) || settings.outputDir.includes('..')) {
            console.error('Error: outputDir must be a relative path without ".." components');
            process.exit(1);
        }
        outputDir = settings.outputDir;
    }
    if (typeof settings.detectionBudgetMs === 'number') {
        detectionBudgetMs = settings.detectionBudgetMs;
    }
    if (settings.hooksEnabled === false) process.exit(0);
} catch { /* use defaults */ }

const configDir = path.join(projectRoot, outputDir);
const contextPath = path.join(configDir, '.qa-context.json');
const stateManagerPath = path.join(pluginRoot, 'scripts', 'state-manager.js');

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

// ---- Utility functions ----

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

// ---- Timed phase runner ----

function runPhase(name, fn, timing, budgetMs) {
    const elapsed = timing.total || 0;
    if (elapsed >= budgetMs) {
        timing.phases[name] = { skipped: true, reason: 'budget_exceeded' };
        return;
    }
    const start = Date.now();
    try {
        fn();
    } catch { /* silent failure per established pattern */ }
    const duration = Date.now() - start;
    timing.phases[name] = { ms: duration };
    timing.total = elapsed + duration;
}

// ---- Workspace parsing helpers ----

function expandWorkspaceGlob(baseDir, pattern) {
    if (!pattern.includes('*')) {
        const fullPath = path.join(baseDir, pattern);
        return fs.existsSync(fullPath) ? [fullPath] : [];
    }
    const parts = pattern.split('*');
    const prefix = parts[0];
    const parentDir = path.join(baseDir, prefix);
    if (!fs.existsSync(parentDir)) return [];
    try {
        return fs.readdirSync(parentDir, { withFileTypes: true })
            .filter(e => e.isDirectory())
            .map(e => path.join(parentDir, e.name));
    } catch { return []; }
}

function inferPackageType(pkgPath) {
    const appMarkers = ['src/pages', 'src/app', 'src/routes', 'public', 'static'];
    for (const marker of appMarkers) {
        if (fs.existsSync(path.join(pkgPath, marker))) return 'app';
    }
    const serviceMarkers = ['Dockerfile', 'server.js', 'server.ts', 'main.go', 'cmd'];
    for (const marker of serviceMarkers) {
        if (fs.existsSync(path.join(pkgPath, marker))) return 'service';
    }
    return 'lib';
}

function resolvePackages(patterns, timing, budgetMs) {
    const packages = [];
    const MAX_PACKAGES = 50;
    for (const pattern of patterns) {
        if (packages.length >= MAX_PACKAGES) {
            console.error(`Warning: monorepo package cap (${MAX_PACKAGES}) reached, skipping remaining`);
            break;
        }
        if ((timing.total || 0) >= budgetMs) break;
        const dirs = expandWorkspaceGlob(projectRoot, pattern);
        for (const dir of dirs) {
            if (packages.length >= MAX_PACKAGES) break;
            if ((timing.total || 0) >= budgetMs) break;
            const name = path.basename(dir);
            const relPath = path.relative(projectRoot, dir);
            packages.push({ name, path: relPath, type: inferPackageType(dir) });
        }
    }
    return packages;
}

function parsePnpmWorkspaceYaml(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');
        const patterns = [];
        let inPackages = false;
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed === 'packages:') {
                inPackages = true;
                continue;
            }
            if (inPackages) {
                if (trimmed.startsWith('- ')) {
                    const pattern = trimmed.slice(2).trim().replace(/^['"]|['"]$/g, '');
                    if (pattern) patterns.push(pattern);
                } else if (trimmed && !trimmed.startsWith('#')) {
                    break;
                }
            }
        }
        return patterns;
    } catch { return []; }
}

function parseGoWork(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const paths = [];
        const useBlock = content.match(/use\s*\(([\s\S]*?)\)/);
        if (useBlock) {
            const lines = useBlock[1].split('\n');
            for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed && !trimmed.startsWith('//')) paths.push(trimmed);
            }
        }
        const singleUse = content.match(/^use\s+(\S+)/m);
        if (singleUse && !useBlock) paths.push(singleUse[1]);
        return paths;
    } catch { return []; }
}

function parseCargoWorkspace(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');
        let inWorkspace = false;
        let inMembers = false;
        const members = [];
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed === '[workspace]') { inWorkspace = true; continue; }
            if (trimmed.startsWith('[') && inWorkspace) break;
            if (inWorkspace) {
                const singleLine = trimmed.match(/^members\s*=\s*\[(.*)\]/);
                if (singleLine) {
                    return singleLine[1].split(',')
                        .map(s => s.trim().replace(/^"|"$/g, ''))
                        .filter(Boolean);
                }
                if (trimmed.match(/^members\s*=\s*\[/)) { inMembers = true; continue; }
                if (inMembers) {
                    if (trimmed === ']') break;
                    const m = trimmed.replace(/,/g, '').replace(/^"|"$/g, '').trim();
                    if (m) members.push(m);
                }
            }
        }
        return members;
    } catch { return []; }
}

function parsePyprojectWorkspace(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');
        let inSection = false;
        const patterns = [];
        for (const line of lines) {
            const trimmed = line.trim().toLowerCase();
            if (trimmed.startsWith('[tool.setuptools.packages')) { inSection = true; continue; }
            if (trimmed.startsWith('[') && inSection) break;
            if (inSection && trimmed && !trimmed.startsWith('#')) {
                const match = trimmed.match(/["']([^"']+)["']/);
                if (match) patterns.push(match[1]);
            }
        }
        return patterns;
    } catch { return []; }
}

// ---- Detection object ----

const detection = {
    languages: [],
    frameworks: [],
    testFrameworks: [],
    cicd: [],
    packageManager: null,
    hasClaudeMd: fileExists('CLAUDE.md'),
    hasReadme: fileExists('README.md'),
    existingDocs: [],
    existingQaConfig: {},
    existingTestDirs: [],
    monorepo: null,
};

const conventions = {
    formatting: null,
    linting: null,
    typescript: null,
    testPatterns: null,
};

const detectionTiming = { total: 0, phases: {} };

// ---- Phase 1: Languages & Frameworks (always runs) ----

runPhase('languages_frameworks', () => {
    // Doc markers
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
        if (exists) detection.existingDocs.push({ path: d.path, type: d.type });
    }

    // CLAUDE.md summary
    if (detection.hasClaudeMd) {
        try {
            const content = fs.readFileSync(path.join(projectRoot, 'CLAUDE.md'), 'utf8');
            const lines = content.split('\n').slice(0, 50);
            detection.existingQaConfig.claudeMdSummary = lines.join('\n');
        } catch { }
    }

    // Languages
    for (const d of detectors.languages) {
        const found = d.glob ? hasGlobMatch(d.marker) : findFileInSubdirs(d.marker);
        if (found && !detection.languages.includes(d.lang)) {
            detection.languages.push(d.lang);
        }
    }

    // Aggregate deps
    const jsDeps = findAllInSubdirs('package.json').flatMap(p => getPackageDeps(p));
    const pyDeps = [
        ...findAllInSubdirs('requirements.txt').flatMap(p => getPythonDeps(p)),
        ...findAllInSubdirs('requirements-dev.txt').flatMap(p => getPythonDeps(p)),
    ];

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

    // Store deps on detection for use by Phase 2
    detection._jsDeps = jsDeps;
    detection._pyDeps = pyDeps;

    // Frameworks
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
            if (!detection.frameworks.includes(f.name)) detection.frameworks.push(f.name);
        }
    }
}, detectionTiming, detectionBudgetMs);

// ---- Phase 2: Test Frameworks (always runs) ----

runPhase('test_frameworks', () => {
    const jsDeps = detection._jsDeps || [];
    const pyDeps = detection._pyDeps || [];

    // Test directories
    const testDirMarkers = ['__tests__', 'tests', 'test', 'spec', 'specs', 'e2e', 'integration-tests'];
    const foundTestDirs = new Set();
    for (const d of testDirMarkers) {
        if (dirExists(d)) foundTestDirs.add(d);
        for (const sub of getSubdirs()) {
            if (dirExists(path.join(sub, d))) foundTestDirs.add(`${sub}/${d}`);
        }
    }
    detection.existingTestDirs = [...foundTestDirs];

    // Test framework deps
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
        if (t.deps.includes(t.key) && !detection.testFrameworks.includes(t.name)) {
            detection.testFrameworks.push(t.name);
        }
    }

    // Test marker files
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
        if (findFileInSubdirs(m.marker) && !detection.testFrameworks.includes(m.name)) {
            detection.testFrameworks.push(m.name);
        }
    }
}, detectionTiming, detectionBudgetMs);

// ---- Phase 3: Package Manager & CI (usually runs) ----

runPhase('package_manager_ci', () => {
    // CI/CD
    for (const d of detectors.cicd) {
        if (d.isDir ? dirExists(d.marker) : fileExists(d.marker)) {
            detection.cicd.push(d.name);
        }
    }

    // Package manager
    for (const d of detectors.packageManagers) {
        if (findFileInSubdirs(d.marker)) { detection.packageManager = d.name; break; }
    }
}, detectionTiming, detectionBudgetMs);

// ---- Phase 4: Monorepo Workspaces (skippable) ----

runPhase('monorepo_workspaces', () => {
    // npm/yarn/bun: package.json workspaces
    if (fileExists('package.json')) {
        try {
            const pkg = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
            let wsPatterns = null;
            if (Array.isArray(pkg.workspaces)) {
                wsPatterns = pkg.workspaces;
            } else if (pkg.workspaces && Array.isArray(pkg.workspaces.packages)) {
                wsPatterns = pkg.workspaces.packages;
            }
            if (wsPatterns && wsPatterns.length > 0) {
                const tool = fileExists('nx.json') ? 'nx' : (detection.packageManager || 'npm');
                const packages = resolvePackages(wsPatterns, detectionTiming, detectionBudgetMs);
                detection.monorepo = { tool, configFile: 'package.json', packages };
                return;
            }
        } catch { }
    }

    // Nx without package.json workspaces
    if (fileExists('nx.json') && !detection.monorepo) {
        detection.monorepo = { tool: 'nx', configFile: 'nx.json', packages: [] };
        return;
    }

    // pnpm
    if (fileExists('pnpm-workspace.yaml')) {
        const patterns = parsePnpmWorkspaceYaml(path.join(projectRoot, 'pnpm-workspace.yaml'));
        if (patterns.length > 0) {
            const packages = resolvePackages(patterns, detectionTiming, detectionBudgetMs);
            detection.monorepo = { tool: 'pnpm', configFile: 'pnpm-workspace.yaml', packages };
            return;
        }
    }

    // Lerna
    if (fileExists('lerna.json')) {
        try {
            const lerna = JSON.parse(fs.readFileSync(path.join(projectRoot, 'lerna.json'), 'utf8'));
            const patterns = lerna.packages || ['packages/*'];
            const packages = resolvePackages(patterns, detectionTiming, detectionBudgetMs);
            detection.monorepo = { tool: 'lerna', configFile: 'lerna.json', packages };
            return;
        } catch { }
    }

    // Go workspaces
    if (fileExists('go.work')) {
        const goPaths = parseGoWork(path.join(projectRoot, 'go.work'));
        if (goPaths.length > 0) {
            const packages = resolvePackages(goPaths, detectionTiming, detectionBudgetMs);
            detection.monorepo = { tool: 'go', configFile: 'go.work', packages };
            return;
        }
    }

    // Rust workspaces
    if (fileExists('Cargo.toml')) {
        const members = parseCargoWorkspace(path.join(projectRoot, 'Cargo.toml'));
        if (members.length > 0) {
            const packages = resolvePackages(members, detectionTiming, detectionBudgetMs);
            detection.monorepo = { tool: 'cargo', configFile: 'Cargo.toml', packages };
            return;
        }
    }

    // Python workspaces
    if (fileExists('pyproject.toml')) {
        const patterns = parsePyprojectWorkspace(path.join(projectRoot, 'pyproject.toml'));
        if (patterns.length > 0) {
            const packages = resolvePackages(patterns, detectionTiming, detectionBudgetMs);
            detection.monorepo = { tool: 'python', configFile: 'pyproject.toml', packages };
            return;
        }
    }
}, detectionTiming, detectionBudgetMs);

// ---- Phase 5: Conventions & Test Patterns (skippable) ----

runPhase('conventions_test_patterns', () => {
    // Formatting: prettier > editorconfig
    const prettierConfigs = [
        '.prettierrc', '.prettierrc.json', '.prettierrc.yaml',
        '.prettierrc.yml', '.prettierrc.js', '.prettierrc.cjs',
        'prettier.config.js', 'prettier.config.cjs',
    ];
    for (const cfg of prettierConfigs) {
        if (fileExists(cfg)) {
            conventions.formatting = { tool: 'prettier', configFile: cfg };
            if (cfg.endsWith('.json') || cfg === '.prettierrc') {
                try {
                    const data = JSON.parse(fs.readFileSync(path.join(projectRoot, cfg), 'utf8'));
                    if (data.tabWidth !== undefined) conventions.formatting.tabWidth = data.tabWidth;
                    if (data.useTabs !== undefined) conventions.formatting.useTabs = data.useTabs;
                    if (data.semi !== undefined) conventions.formatting.semi = data.semi;
                    if (data.singleQuote !== undefined) conventions.formatting.singleQuote = data.singleQuote;
                } catch { }
            }
            break;
        }
    }

    // Editorconfig fallback
    if (!conventions.formatting && fileExists('.editorconfig')) {
        conventions.formatting = { tool: 'editorconfig', configFile: '.editorconfig' };
        try {
            const content = fs.readFileSync(path.join(projectRoot, '.editorconfig'), 'utf8');
            const indentMatch = content.match(/indent_style\s*=\s*(\w+)/);
            const sizeMatch = content.match(/indent_size\s*=\s*(\d+)/);
            if (indentMatch) conventions.formatting.indentStyle = indentMatch[1];
            if (sizeMatch) conventions.formatting.indentSize = parseInt(sizeMatch[1]);
        } catch { }
    }

    // Linting
    const eslintConfigs = [
        '.eslintrc', '.eslintrc.json', '.eslintrc.js', '.eslintrc.cjs',
        '.eslintrc.yaml', '.eslintrc.yml', 'eslint.config.js', 'eslint.config.mjs',
    ];
    for (const cfg of eslintConfigs) {
        if (fileExists(cfg)) {
            conventions.linting = { tool: 'eslint', configFile: cfg };
            break;
        }
    }
    if (!conventions.linting) {
        const otherLinters = [
            { file: '.pylintrc', tool: 'pylint' },
            { file: '.flake8', tool: 'flake8' },
            { file: '.rubocop.yml', tool: 'rubocop' },
        ];
        for (const l of otherLinters) {
            if (fileExists(l.file)) {
                conventions.linting = { tool: l.tool, configFile: l.file };
                break;
            }
        }
    }

    // TypeScript
    if (fileExists('tsconfig.json')) {
        conventions.typescript = { configFile: 'tsconfig.json' };
        try {
            const data = JSON.parse(fs.readFileSync(path.join(projectRoot, 'tsconfig.json'), 'utf8'));
            conventions.typescript.strict = data.compilerOptions?.strict || false;
            conventions.typescript.target = data.compilerOptions?.target || null;
        } catch { }
    }

    // Test patterns
    const testDirs = detection.existingTestDirs || [];
    if (testDirs.length > 0) {
        const testPatterns = { filePattern: null, testDirs, namingConvention: null };
        for (const dir of testDirs.slice(0, 3)) {
            const fullDir = path.join(projectRoot, dir);
            try {
                const files = fs.readdirSync(fullDir);
                const testFiles = files.filter(f => f.includes('.test.'));
                const specFiles = files.filter(f => f.includes('.spec.'));
                const pyTestFiles = files.filter(f => f.startsWith('test_'));
                if (testFiles.length > specFiles.length && testFiles.length > pyTestFiles.length) {
                    testPatterns.filePattern = '*.test.*';
                    testPatterns.namingConvention = 'test';
                } else if (specFiles.length > 0 && specFiles.length >= pyTestFiles.length) {
                    testPatterns.filePattern = '*.spec.*';
                    testPatterns.namingConvention = 'spec';
                } else if (pyTestFiles.length > 0) {
                    testPatterns.filePattern = 'test_*.py';
                    testPatterns.namingConvention = 'pytest';
                }
                if (testPatterns.filePattern) break;
            } catch { }
        }
        conventions.testPatterns = testPatterns;
    }
}, detectionTiming, detectionBudgetMs);

// Clean up internal deps cache
delete detection._jsDeps;
delete detection._pyDeps;

// ---- Merge detection into project state ----

let projectState = {
    schemaVersion: 1,
    detectedAt: null,
    projectRoot,
    outputDir,
    detection: {},
    conventions: {},
    detectionTiming: {},
    risks: [],
    coverageGaps: [],
    testingConventions: [],
    historicalFindings: {
        totalSessions: 0,
        bugsReported: 0,
        testCasesGenerated: 0,
        areasReviewed: [],
    },
};

if (fs.existsSync(contextPath)) {
    try {
        const existing = JSON.parse(fs.readFileSync(contextPath, 'utf8'));
        if (existing.schemaVersion === 1) {
            projectState = existing;
        }
    } catch { /* use default on parse error */ }
}

projectState.schemaVersion = 1;
projectState.detectedAt = new Date().toISOString();
projectState.projectRoot = projectRoot;
projectState.outputDir = outputDir;
projectState.detection = detection;
projectState.conventions = conventions;
projectState.detectionTiming = detectionTiming;

const dryRun = process.argv.includes('--dry-run');

if (!dryRun) {
    // Save to .qa-context.json (atomic write)
    if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
    }
    const tmpContextPath = contextPath + '.tmp';
    fs.writeFileSync(tmpContextPath, JSON.stringify(projectState, null, 2));
    fs.renameSync(tmpContextPath, contextPath);
}

// ---- Initialize session state ----

let sessionStatus = dryRun ? 'dry-run (no writes)' : 'new (first session)';
if (!dryRun) {
    try {
        execFileSync('node', [stateManagerPath, 'init', 'session'], {
            cwd: projectRoot,
            env: { ...process.env, CLAUDE_PLUGIN_ROOT: pluginRoot },
            encoding: 'utf8',
            timeout: 5000,
        });
        const sessionsDir = path.join(configDir, 'sessions');
        if (fs.existsSync(sessionsDir)) {
            try {
                const archived = fs.readdirSync(sessionsDir).filter(f => f.endsWith('.json'));
                if (archived.length > 0) {
                    sessionStatus = 'new (previous archived)';
                }
            } catch { /* ignore */ }
        }
    } catch (err) {
        sessionStatus = 'init failed (non-blocking)';
    }
}

// ---- Output context ----

outputContext(detection, conventions, projectState, sessionStatus);

function walkDirCollect(dir, files) {
    let entries;
    try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch { return; }
    for (const entry of entries) {
        if (entry.name.startsWith('.')) continue;
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            walkDirCollect(fullPath, files);
        } else if (entry.isFile()) {
            try {
                const stat = fs.statSync(fullPath);
                files.push({ path: fullPath, mtimeMs: stat.mtimeMs });
            } catch { /* skip unreadable files */ }
        }
    }
}

function scanArtifacts() {
    const summary = {};
    if (!fs.existsSync(configDir)) return summary;

    let topEntries;
    try {
        topEntries = fs.readdirSync(configDir, { withFileTypes: true });
    } catch { return summary; }

    for (const entry of topEntries) {
        if (!entry.isDirectory()) continue;
        if (entry.name.startsWith('.')) continue;
        if (entry.name === 'sessions') continue;

        const dirPath = path.join(configDir, entry.name);
        const files = [];
        walkDirCollect(dirPath, files);
        if (files.length === 0) continue;

        let latestTime = 0;
        for (const file of files) {
            if (file.mtimeMs > latestTime) latestTime = file.mtimeMs;
        }
        const latestDate = new Date(latestTime).toISOString().split('T')[0];
        const label = entry.name.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        summary[label] = { count: files.length, latest: latestDate, dir: entry.name };
    }
    return summary;
}

function outputContext(det, conv, state, sessStatus) {
    const lines = ['[QA Toolkit — Project Context]'];
    if (det.languages.length) lines.push(`Languages: ${det.languages.join(', ')}`);
    if (det.frameworks.length) lines.push(`Frameworks: ${det.frameworks.join(', ')}`);
    if (det.testFrameworks.length) lines.push(`Test Frameworks: ${det.testFrameworks.join(', ')}`);
    if (det.cicd.length) lines.push(`CI/CD: ${det.cicd.join(', ')}`);
    if (det.packageManager) lines.push(`Package Manager: ${det.packageManager}`);
    if (det.existingTestDirs?.length) lines.push(`Test Directories: ${det.existingTestDirs.join(', ')}`);
    lines.push(`CLAUDE.md: ${det.hasClaudeMd ? 'exists (will be read for context)' : 'not found'}`);
    if (det.existingDocs?.length) {
        const docTypes = det.existingDocs.map(d => d.type).join(', ');
        lines.push(`Existing Docs: ${docTypes}`);
    }

    // Monorepo info
    if (det.monorepo) {
        lines.push(`Monorepo: ${det.monorepo.tool} (${det.monorepo.packages.length} packages)`);
    }

    // Convention summary
    if (conv.formatting) {
        lines.push(`Formatting: ${conv.formatting.tool} (${conv.formatting.configFile})`);
    }
    if (conv.linting) {
        lines.push(`Linting: ${conv.linting.tool} (${conv.linting.configFile})`);
    }
    if (conv.typescript) {
        lines.push(`TypeScript: ${conv.typescript.strict ? 'strict mode' : 'non-strict'}`);
    }
    if (conv.testPatterns && conv.testPatterns.filePattern) {
        const dirs = conv.testPatterns.testDirs.join(', ');
        lines.push(`Test Pattern: ${conv.testPatterns.filePattern} in ${dirs}`);
    }

    lines.push(`Config: ${outputDir}/.qa-context.json`);
    lines.push(`Output Directory: ${outputDir}/`);

    // Session status
    lines.push('');
    lines.push('[Session]');
    lines.push(`Session: ${sessStatus}`);

    // Accumulated knowledge summary
    const hist = state.historicalFindings;
    if (hist && hist.totalSessions > 0) {
        lines.push(`Previous Sessions: ${hist.totalSessions}`);
        if (hist.areasReviewed.length > 0) {
            lines.push(`Areas Reviewed: ${hist.areasReviewed.join(', ')}`);
        }
        if (hist.bugsReported > 0) lines.push(`Bugs Reported: ${hist.bugsReported}`);
        if (hist.testCasesGenerated > 0) lines.push(`Test Cases Generated: ${hist.testCasesGenerated}`);
    }
    if (state.risks && state.risks.length > 0) {
        lines.push(`Known Risks: ${state.risks.length}`);
    }
    if (state.coverageGaps && state.coverageGaps.length > 0) {
        lines.push(`Coverage Gaps: ${state.coverageGaps.length}`);
    }

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
