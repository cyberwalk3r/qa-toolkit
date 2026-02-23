# QA Toolkit v1.1.0 Improvements — Implementation Plan

**Goal:** Fix 10 weaknesses in qa-toolkit v1.0.0 — 2 critical bugs, 4 significant issues, 4 design gaps.

**Architecture:** All changes are to existing files (scripts, hooks config, skill markdown, agent markdown, README). No new runtime dependencies. One new file: CLAUDE.md.

**Tech Stack:** Node.js scripts, Markdown skills/agents, JSON config.

**Design doc:** `docs/plans/2026-02-23-plugin-improvements-design.md`

---

### Task 1: Fix broken hook event — TaskCompleted → Stop

**Files:**
- Modify: `hooks/hooks.json`

**Step 1: Fix the hook event name**

In `hooks/hooks.json`, replace `"TaskCompleted"` with `"Stop"`:

```json
{
    "hooks": {
        "SessionStart": [
            {
                "hooks": [
                    {
                        "type": "command",
                        "command": "node \"${CLAUDE_PLUGIN_ROOT}/scripts/detect-project.js\""
                    }
                ]
            }
        ],
        "Stop": [
            {
                "hooks": [
                    {
                        "type": "command",
                        "command": "node \"${CLAUDE_PLUGIN_ROOT}/scripts/save-artifact.js\""
                    }
                ]
            }
        ]
    }
}
```

**Step 2: Commit**

```bash
git add hooks/hooks.json
git commit -s -m "fix: replace invalid TaskCompleted hook with Stop event"
```

---

### Task 2: Remove dead code in detect-project.js

**Files:**
- Modify: `scripts/detect-project.js`

**Step 1: Delete the unused `detectors.frameworks` and `detectors.testFrameworks` arrays**

In `scripts/detect-project.js`, the `detectors` object (lines 32-108) has four properties: `languages`, `frameworks`, `testFrameworks`, `cicd`, `packageManagers`. Only `languages`, `cicd`, and `packageManagers` are iterated. `frameworks` and `testFrameworks` are dead — the real work is done by `frameworkChecks` (line 230) and `testChecks` (line 252).

Delete the `frameworks` array (lines 53-66) and the `testFrameworks` array (lines 67-86) from the `detectors` object. Keep `languages`, `cicd`, and `packageManagers`.

The resulting `detectors` object should be:

```javascript
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
```

**Step 2: Commit**

```bash
git add scripts/detect-project.js
git commit -s -m "fix: remove dead detectors.frameworks and detectors.testFrameworks arrays"
```

---

### Task 3: Lazy directory creation

**Files:**
- Modify: `scripts/detect-project.js`

**Step 1: Remove subdirectory creation from detect-project.js**

In `scripts/detect-project.js`, find the block that creates artifact subdirectories (around lines 307-316 after Task 2 edits):

```javascript
// Create artifact subdirectories
const artifactDirs = [
    'pr-reviews', 'bug-reports', 'test-cases', 'api-tests',
    'regression-plans', 'test-data', 'a11y-audits',
    'release-assessments', 'e2e-tests'
];
for (const dir of artifactDirs) {
    const dirPath = path.join(configDir, dir);
    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}
```

Delete this entire block. Keep the `qa-artifacts/` root creation (line ~302) because the config JSON goes there.

**Step 2: Commit**

```bash
git add scripts/detect-project.js
git commit -s -m "fix: stop eagerly creating artifact subdirectories on session start"
```

---

### Task 4: Fix pyproject.toml parsing

**Files:**
- Modify: `scripts/detect-project.js`

**Step 1: Replace the crude regex with section-aware parsing**

Find the pyproject.toml parsing block (around lines 224-228 after previous edits):

```javascript
// Check pyproject.toml dependencies too
try {
    const pyproject = fs.readFileSync(path.join(projectRoot, 'pyproject.toml'), 'utf8').toLowerCase();
    const depMatches = pyproject.match(/["']([a-z0-9_-]+)["']/g) || [];
    pyDeps.push(...depMatches.map(m => m.replace(/["']/g, '')));
} catch { }
```

Replace with:

```javascript
// Check pyproject.toml dependencies — section-aware parsing
try {
    const pyproject = fs.readFileSync(path.join(projectRoot, 'pyproject.toml'), 'utf8');
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
            // Match dependency name: "package-name", 'package-name', or bare package-name (before = or >)
            const match = trimmed.match(/^["']?([a-z0-9_-]+)/);
            if (match) pyDeps.push(match[1]);
        }
    }
} catch { }
```

**Step 2: Commit**

```bash
git add scripts/detect-project.js
git commit -s -m "fix: parse pyproject.toml dependencies by section instead of regex-matching all strings"
```

---

### Task 5: Recursive glob for .csproj/.sln

**Files:**
- Modify: `scripts/detect-project.js`

**Step 1: Replace `hasGlobMatch` with recursive version**

Find the current `hasGlobMatch` function (around line 119):

```javascript
function hasGlobMatch(pattern) {
    try {
        const ext = pattern.replace('*', '');
        const files = fs.readdirSync(projectRoot);
        return files.some(f => f.endsWith(ext));
    } catch { return false; }
}
```

Replace with:

```javascript
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
```

**Step 2: Commit**

```bash
git add scripts/detect-project.js
git commit -s -m "fix: recursive glob matching (depth 3) for .csproj/.sln detection"
```

---

### Task 6: Validate browser arg in run-test.js

**Files:**
- Modify: `skills/e2e-test/scripts/run-test.js`

**Step 1: Add browser validation after flag parsing**

Find the browser parsing line (around line 55):

```javascript
const browser = browserIdx >= 0 ? args[browserIdx + 1] : 'chromium';
```

Add validation immediately after:

```javascript
const validBrowsers = ['chromium', 'firefox', 'webkit'];
if (!validBrowsers.includes(browser)) {
    console.error(`Error: Invalid browser "${browser}". Must be one of: ${validBrowsers.join(', ')}`);
    process.exit(1);
}
```

**Step 2: Commit**

```bash
git add skills/e2e-test/scripts/run-test.js
git commit -s -m "fix: validate --browser arg against chromium/firefox/webkit whitelist"
```

---

### Task 7: Add configurable output directory

**Files:**
- Modify: `settings.json`
- Modify: `scripts/detect-project.js`
- Modify: `scripts/save-artifact.js`

**Step 1: Add outputDir to settings.json**

Replace the full content of `settings.json`:

```json
{
    "agent": "qa-reviewer",
    "outputDir": "qa-artifacts"
}
```

**Step 2: Update detect-project.js to read outputDir from settings**

At the top of `scripts/detect-project.js`, after the existing `const projectRoot` line, find:

```javascript
const projectRoot = process.cwd();
const configDir = path.join(projectRoot, 'qa-artifacts');
```

Replace with:

```javascript
const projectRoot = process.cwd();

// Read output directory from plugin settings
let outputDir = 'qa-artifacts';
try {
    const pluginRoot = process.env.CLAUDE_PLUGIN_ROOT || path.join(__dirname, '..');
    const settings = JSON.parse(fs.readFileSync(path.join(pluginRoot, 'settings.json'), 'utf8'));
    if (settings.outputDir) outputDir = settings.outputDir;
} catch { /* use default */ }

const configDir = path.join(projectRoot, outputDir);
```

Also update the `outputContext` function — find the line:

```javascript
    lines.push(`Config: qa-artifacts/.qa-config.json`);
```

Replace with:

```javascript
    lines.push(`Config: ${outputDir}/.qa-config.json`);
    lines.push(`Output Directory: ${outputDir}/`);
```

Also in the config object, add the outputDir so skills can read it:

Find:

```javascript
const config = {
    detectedAt: new Date().toISOString(),
    projectRoot,
```

Replace with:

```javascript
const config = {
    detectedAt: new Date().toISOString(),
    projectRoot,
    outputDir,
```

**Step 3: Update save-artifact.js to read outputDir**

In `scripts/save-artifact.js`, find:

```javascript
const projectRoot = process.cwd();
const configDir = path.join(projectRoot, 'qa-artifacts');
```

Replace with:

```javascript
const projectRoot = process.cwd();

// Read output directory from config or default
let outputDir = 'qa-artifacts';
try {
    const configPath = path.join(projectRoot, 'qa-artifacts', '.qa-config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    if (config.outputDir) outputDir = config.outputDir;
} catch { /* use default */ }

const configDir = path.join(projectRoot, outputDir);
```

**Step 4: Commit**

```bash
git add settings.json scripts/detect-project.js scripts/save-artifact.js
git commit -s -m "feat: configurable output directory via settings.json outputDir"
```

---

### Task 8: Add skill cross-referencing

**Files:**
- Modify: `skills/pr-review/SKILL.md`
- Modify: `skills/bug-report/SKILL.md`
- Modify: `skills/test-cases/SKILL.md`
- Modify: `skills/api-test/SKILL.md`
- Modify: `skills/e2e-test/SKILL.md`
- Modify: `skills/regression-planner/SKILL.md`
- Modify: `skills/accessibility/SKILL.md`
- Modify: `skills/release-readiness/SKILL.md`
- Modify: `skills/test-data/SKILL.md`
- Modify: `skills/setup/SKILL.md`

**Step 1: Add "Suggested Next Steps" section to each skill**

Append to the end of each SKILL.md (before any existing final section or at the very end):

**`skills/pr-review/SKILL.md`** — append:

```markdown
## Suggested Next Steps
After generating the review, suggest based on results:
- If Risk Level is **Medium or higher**: "Consider running `/qa-toolkit:regression-planner` to map the impact radius and plan targeted regression testing."
- Always: "Generate test cases for the changed functionality with `/qa-toolkit:test-cases`."
```

**`skills/bug-report/SKILL.md`** — append:

```markdown
## Suggested Next Steps
After generating the bug report, suggest:
- "Create test cases to cover this bug scenario and prevent regression with `/qa-toolkit:test-cases`."
```

**`skills/test-cases/SKILL.md`** — append:

```markdown
## Suggested Next Steps
After generating test cases, suggest:
- "Generate synthetic test data for these scenarios with `/qa-toolkit:test-data`."
- "Automate the P0/P1 cases as Playwright E2E tests with `/qa-toolkit:e2e-test`."
```

**`skills/api-test/SKILL.md`** — append:

```markdown
## Suggested Next Steps
After generating API tests, suggest:
- "Generate realistic test payloads with `/qa-toolkit:test-data`."
```

**`skills/e2e-test/SKILL.md`** — append:

```markdown
## Suggested Next Steps
After generating E2E tests, suggest:
- "Run an accessibility audit on the same pages with `/qa-toolkit:accessibility`."
```

**`skills/regression-planner/SKILL.md`** — append:

```markdown
## Suggested Next Steps
After generating the regression plan, suggest:
- "When regression testing is complete, assess release readiness with `/qa-toolkit:release-readiness`."
```

**`skills/accessibility/SKILL.md`** — append:

```markdown
## Suggested Next Steps
After generating the audit, suggest:
- "File each critical/major finding as a bug report with `/qa-toolkit:bug-report`."
```

**`skills/release-readiness/SKILL.md`** — append:

```markdown
## Suggested Next Steps
After generating the assessment, suggest based on results:
- If verdict is **NO-GO** or Regression Score is below 70: "Plan targeted regression testing with `/qa-toolkit:regression-planner`."
```

**`skills/test-data/SKILL.md`** — no cross-reference needed, skip.

**`skills/setup/SKILL.md`** — append:

```markdown
## Suggested Next Steps
After setup is complete, suggest:
- "Start with a PR review (`/qa-toolkit:pr-review`) or generate test cases from your requirements (`/qa-toolkit:test-cases`)."
```

**Step 2: Commit**

```bash
git add skills/*/SKILL.md
git commit -s -m "feat: add contextual Suggested Next Steps cross-references to all skills"
```

---

### Task 9: Add CLAUDE.md for the plugin repo

**Files:**
- Create: `CLAUDE.md`

**Step 1: Create CLAUDE.md at repo root**

```markdown
# QA Toolkit — Development Guide

## What This Is

A Claude Code plugin providing 10 QA skills (slash commands) and 3 agent personas. Auto-detects project tech stack and produces structured QA artifacts.

## Project Structure

```
.claude-plugin/plugin.json  — Plugin manifest (name, version, metadata)
settings.json               — Default agent and plugin settings
hooks/hooks.json            — Event hooks (SessionStart, Stop)
scripts/detect-project.js   — Auto-detection script (runs on SessionStart)
scripts/save-artifact.js    — Activity logger (runs on Stop)
agents/<name>.md            — Agent persona definitions (conversational, multi-turn)
skills/<name>/SKILL.md      — Skill definitions (one-shot structured output)
skills/<name>/references/   — Domain-specific knowledge files
skills/<name>/scripts/      — Helper scripts (e.g., Playwright runner)
```

## Conventions

### Skills
- `SKILL.md` must have YAML frontmatter with `name` and `description` (one sentence)
- Skills produce one-shot structured output and save to the configured output directory
- Each skill reads `<outputDir>/.qa-config.json` for project context
- Reference files contain non-obvious, specific guidance — not generic info
- Include a "Suggested Next Steps" section with conditional cross-references to related skills

### Agents
- Agent `.md` files have YAML frontmatter with `name` and `description`
- Agents define personas for conversational, multi-turn QA work (ongoing review sessions, exploratory discussions)
- Agents define tone and expertise, not workflows — workflows belong in skills

### Scripts
- All scripts are Node.js with no external dependencies (stdlib only)
- Scripts read `settings.json` for plugin-level config (e.g., `outputDir`)
- The output directory defaults to `qa-artifacts/` and is configurable via `settings.json`

## Testing Locally

```bash
claude plugin add ./qa-toolkit
claude --debug --plugin-dir ./qa-toolkit
```

## Output Directory

All generated artifacts save to `<outputDir>/` (default: `qa-artifacts/`) in the target project. Subdirectories are created lazily on first artifact save, not eagerly on session start.
```

**Step 2: Commit**

```bash
git add CLAUDE.md
git commit -s -m "docs: add CLAUDE.md with plugin development conventions"
```

---

### Task 10: Clarify agent/skill boundary

**Files:**
- Modify: `agents/qa-reviewer.md`
- Modify: `agents/qa-explorer.md`
- Modify: `agents/qa-lead.md`
- Modify: `README.md`

**Step 1: Update agent frontmatter descriptions to clarify they're for multi-turn work**

**`agents/qa-reviewer.md`** — change the frontmatter `description` to:

```yaml
description: Conversational QA reviewer for multi-turn PR review sessions — translates code changes into testing impact through interactive discussion
```

**`agents/qa-explorer.md`** — change the frontmatter `description` to:

```yaml
description: Conversational exploratory testing persona for multi-turn sessions — generates edge cases and test scenarios through interactive discussion
```

**`agents/qa-lead.md`** — change the frontmatter `description` to:

```yaml
description: Conversational QA lead for multi-turn strategic sessions — release decisions, quality metrics, and test planning through interactive discussion
```

**Step 2: Add "Agents vs Skills" section to README.md**

After the "## Agents" section and before "## Install", add:

```markdown
## Agents vs Skills

**Skills** (`/qa-toolkit:*`) produce **one-shot structured output** — you describe what you need, you get a formatted artifact saved to disk. Use these for specific deliverables: a PR review, a bug report, a test plan.

**Agents** are **conversational personas** for multi-turn interactive work. Use these when you want an ongoing QA discussion: "walk me through this PR," "help me explore edge cases for this feature," "let's assess whether we're ready to release." Agents remember context across the conversation and adapt their guidance as you share more information.

| Need | Use |
|------|-----|
| Structured PR review document | `/qa-toolkit:pr-review` (skill) |
| Interactive PR walkthrough with Q&A | `qa-reviewer` (agent) |
| Bug report from a description | `/qa-toolkit:bug-report` (skill) |
| Brainstorm what could break in a feature | `qa-explorer` (agent) |
| Go/no-go release document | `/qa-toolkit:release-readiness` (skill) |
| Strategic release planning discussion | `qa-lead` (agent) |
```

**Step 3: Commit**

```bash
git add agents/*.md README.md
git commit -s -m "docs: clarify agent vs skill boundary — agents are conversational, skills are one-shot"
```

---

### Task 11: Update CHANGELOG.md

**Files:**
- Modify: `CHANGELOG.md`

**Step 1: Add v1.1.0 entry**

Prepend to `CHANGELOG.md` after the `# Changelog` header:

```markdown
## [1.1.0] — 2026-02-23

### Fixed
- Replace invalid `TaskCompleted` hook event with `Stop` — activity logging now works
- Remove dead `detectors.frameworks` and `detectors.testFrameworks` arrays in detect-project.js
- Stop eagerly creating 9 empty artifact subdirectories on session start
- Parse pyproject.toml dependencies by TOML section instead of regex-matching all quoted strings
- Recursive glob matching (depth 3) for .csproj/.sln detection in subdirectories
- Validate `--browser` argument in run-test.js against chromium/firefox/webkit

### Added
- Configurable output directory via `settings.json` `outputDir` field
- Contextual "Suggested Next Steps" cross-references in all skills
- CLAUDE.md with plugin development conventions
- "Agents vs Skills" section in README clarifying when to use each
```

**Step 2: Commit**

```bash
git add CHANGELOG.md
git commit -s -m "docs: add v1.1.0 changelog entry"
```
