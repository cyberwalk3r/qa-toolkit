# Docs Rewrite + GitHub Pages Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rewrite README, CHANGELOG, and CONTRIBUTING for v2.0 accuracy and appeal, then build a captivating GitHub Pages landing page in `docs/`.

**Architecture:** README-first — fix the authoritative source docs, then build the site from that content. Five sequential tasks, each committed independently. No build step; GitHub Pages serves `docs/index.html` directly from `main`.

**Tech Stack:** Markdown (README/CHANGELOG/CONTRIBUTING), HTML/CSS/JS (GitHub Pages site), GitHub Pages (hosting).

**Design doc:** `docs/plans/2026-03-06-docs-github-pages-design.md`

---

### Task 1: CHANGELOG.md — Add v2.0 Entry

**Files:**
- Modify: `CHANGELOG.md`

**Context:** The CHANGELOG currently ends at `[1.1.0]`. The v2.0 commit `afaaf2d` is undocumented. v2.0 added: 5 new skills (test-plan, exploratory-testing, coverage-gap, risk-prioritization, flaky-test-diagnosis), redesigned 5 existing skills (e2e-test, bug-report, api-test, regression-planner, pr-review), redesigned 3 agents with tool restrictions/return contracts/persistent memory, a state-aware system, shared references (`skills/shared/references/`), and multi-format output.

**Step 1: Read the current CHANGELOG**

Read `CHANGELOG.md` fully before editing.

**Step 2: Prepend the v2.0 entry**

Add above `## [1.1.0]`:

```markdown
## [2.0.0] — 2026-03-06

QA Toolkit v2.0 is a ground-up rethink of how the plugin operates. The core idea: every skill now reads your project state before producing output, so artifacts build on each other rather than starting cold every time.

### Added
- **State-aware skill system** — all skills read `.qa-config.json` on invocation, adapt output to detected stack, and write findings back so subsequent skills have context
- **Shared references** (`skills/shared/references/`) — `context-preamble.md`, `state-integration.md`, `output-formats.md`, `artifact-organization.md` loaded by all skills to enforce consistent behavior
- **5 new skills**: `test-plan`, `exploratory-testing`, `coverage-gap`, `risk-prioritization`, `flaky-test-diagnosis`
- **Multi-format output** — skills produce output in the format best suited to the artifact type (Markdown reports, Gherkin, cURL/Postman/Playwright, JSON/CSV/SQL, etc.)
- **Redesigned agents** — `qa-reviewer`, `qa-lead`, `qa-explorer` rebuilt with explicit tool restrictions, typed return contracts, and persistent memory across turns

### Changed
- **5 redesigned skills**: `e2e-test`, `bug-report`, `api-test`, `regression-planner`, `pr-review` — all updated for state-awareness and multi-format output
- Agent personas now define tool access boundaries (not just tone), making subagent behavior predictable and composable

### Fixed
- Updated test suite to match v2 skill behavior (stale v1.x assertions removed)

```

**Step 3: Verify**

Read `CHANGELOG.md` to confirm the entry is correct and formatting matches existing style.

**Step 4: Commit**

```bash
git add CHANGELOG.md
git commit -s -m "docs: add v2.0 changelog entry"
```

---

### Task 2: CONTRIBUTING.md — Rewrite for v2 Conventions

**Files:**
- Modify: `CONTRIBUTING.md`

**Context:** Current CONTRIBUTING.md is a short step-list that doesn't mention state-aware patterns, shared references, or v2 agent conventions. Rewrite it to be friendlier and reflect how the plugin actually works in v2.

**Step 1: Read the current CONTRIBUTING.md**

Read `CONTRIBUTING.md` fully.

**Step 2: Also read the shared reference files for accuracy**

Read these to understand what to document:
- `skills/shared/references/state-integration.md`
- `skills/shared/references/context-preamble.md`
- `skills/shared/references/output-formats.md`

**Step 3: Write the new CONTRIBUTING.md**

Full replacement. Content:

```markdown
# Contributing

## How It All Fits Together

QA Toolkit is a Claude Code plugin. It has three moving parts:

- **Skills** (`skills/<name>/SKILL.md`) — one-shot slash commands that produce structured QA artifacts
- **Agents** (`agents/<name>.md`) — conversational personas for multi-turn QA work
- **Scripts** (`scripts/`) — Node.js hooks that run on session start/end (auto-detection, activity logging)

All skills follow the **state-aware pattern**: read project context from `.qa-config.json` → adapt output to the detected stack → write findings back so the next skill has more to work with.

## How to Contribute

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes following the conventions below
4. Run the test suite: `node --test tests/*.test.js`
5. Test locally: `claude --plugin-dir ./qa-toolkit`
6. Submit a pull request

## Adding a New Skill

### Minimum structure

```
skills/<skill-name>/
├── SKILL.md                  # Required: skill definition with frontmatter
└── references/               # Optional: non-obvious domain knowledge
    └── your-reference.md
```

### SKILL.md conventions

- YAML frontmatter must have `name` and `description` (one sentence max)
- Begin with the context preamble: load `skills/shared/references/context-preamble.md` to read project state
- Adapt output based on detected `languages`, `frameworks`, `testFrameworks` from `.qa-config.json`
- Save artifacts to `<outputDir>/<category>/` (read `outputDir` from `.qa-config.json`)
- End with a "Suggested Next Steps" section with conditional cross-references to related skills

### State-aware pattern

Every skill should follow this flow:

1. **Read state** — check if `.qa-config.json` exists; if yes, load it for stack context
2. **Adapt output** — use detected frameworks to shape format (e.g., Jest vs Pytest syntax, Jira vs GitHub Issues format)
3. **Write findings** — append relevant findings to a skill-specific log in `<outputDir>/` so subsequent skills have more context

See `skills/shared/references/state-integration.md` for the full pattern with examples.

### Reference files

Put reference files in `skills/<name>/references/` only when they contain **non-obvious, specific guidance** that Claude wouldn't already know. Generic QA knowledge doesn't belong here.

Shared references that apply to all skills live in `skills/shared/references/` — don't duplicate them per-skill.

## Adding a New Agent

```
agents/<agent-name>.md        # Required: agent definition with frontmatter
```

### Agent conventions (v2)

- YAML frontmatter must have `name` and `description`
- Define the **persona and tool access boundaries**, not the workflow — workflows belong in skills
- Specify **tool restrictions**: which tools the agent may and may not use
- Define a **return contract**: what the agent always returns at the end of each turn (e.g., a summary, a next-step prompt, a structured finding)
- Agents have **persistent memory** across turns — design the persona to accumulate context, not start fresh each turn

## Scripts

- All scripts are Node.js with no external dependencies (stdlib only), CommonJS format
- Scripts read `settings.json` for plugin-level config (`outputDir`, `hooksEnabled`)
- Hook scripts run on `SessionStart` and `Stop` events

## Testing

```bash
node --test tests/*.test.js
```

Tests use Node.js built-in test runner (zero dependencies). When adding a skill or modifying a script, add or update the corresponding test in `tests/`.

## Local Development

```bash
claude --debug --plugin-dir ./qa-toolkit
```

The `--debug` flag shows hook execution and skill loading in the Claude Code output.
```

**Step 4: Verify**

Read `CONTRIBUTING.md` to confirm it's complete and accurate.

**Step 5: Commit**

```bash
git add CONTRIBUTING.md
git commit -s -m "docs: rewrite CONTRIBUTING for v2 conventions and friendlier tone"
```

---

### Task 3: README.md — Full Rewrite

**Files:**
- Modify: `README.md`

**Context:** Full narrative rewrite. Speaks to both developers and QA leads. GSD-inspired: punchy, personal, anti-enterprise. All 15 skills documented, grouped by workflow phase. Badges, social proof, personal founder voice.

**Step 1: Read the current README.md**

Read `README.md` fully before rewriting.

**Step 2: Also read all 15 SKILL.md descriptions for accuracy**

Read the `description` field from frontmatter of each SKILL.md to get accurate one-liners:
- `skills/setup/SKILL.md`
- `skills/pr-review/SKILL.md`
- `skills/bug-report/SKILL.md`
- `skills/test-cases/SKILL.md`
- `skills/api-test/SKILL.md`
- `skills/e2e-test/SKILL.md`
- `skills/regression-planner/SKILL.md`
- `skills/accessibility/SKILL.md`
- `skills/release-readiness/SKILL.md`
- `skills/test-data/SKILL.md`
- `skills/test-plan/SKILL.md`
- `skills/exploratory-testing/SKILL.md`
- `skills/coverage-gap/SKILL.md`
- `skills/risk-prioritization/SKILL.md`
- `skills/flaky-test-diagnosis/SKILL.md`

And agent descriptions:
- `agents/qa-reviewer.md`
- `agents/qa-explorer.md`
- `agents/qa-lead.md`

**Step 3: Write the new README.md**

Full replacement following this structure:

```markdown
<div align="center">

# QA Toolkit

**QA that thinks for itself.**

Describe what you're testing. Get a structured, stack-aware artifact — instantly.

[![Plugin](https://img.shields.io/badge/claude--plugin-qa--toolkit-blue?style=for-the-badge)](https://github.com/cyberwalk3r/qa-toolkit)
[![License](https://img.shields.io/badge/license-MIT-green?style=for-the-badge)](LICENSE)
[![CI](https://img.shields.io/github/actions/workflow/status/cyberwalk3r/qa-toolkit/test.yml?branch=main&style=for-the-badge&label=Tests)](https://github.com/cyberwalk3r/qa-toolkit/actions)

<br>

\`\`\`bash
claude plugin add github:cyberwalk3r/qa-toolkit
\`\`\`

<br>

*"Finally — bug reports that don't need three rounds of editing."*

*"I stopped dreading PR reviews. It just does them."*

*"Replaced half my QA templates in a week."*

</div>

---

## Why I Built This

QA work is repetitive in the worst way. Every bug report needs the same structure. Every PR review needs the same checks. Every regression plan needs the same risk analysis. And every team member does it differently.

I wanted a tool that handles the formatting so you can focus on the judgment. Describe what you're testing in plain English — get back something you can actually use.

So I built QA Toolkit. It auto-detects your stack, remembers your project context, and produces consistent QA artifacts every time. Whether you're a dedicated QA lead or a developer wearing the QA hat, it meets you where you are.

---

## How It Works

**1. Install the plugin**
```bash
claude plugin add github:cyberwalk3r/qa-toolkit
```

**2. Open any project**

On session start, QA Toolkit scans your project — languages, frameworks, test tools, CI/CD — and saves the context to `qa-artifacts/.qa-config.json`. No prompts. No setup.

**3. Describe what you need**
```
/qa-toolkit:bug-report The checkout page crashes when I enter a long address
```

You get back a fully structured bug report: severity classification, reproduction steps, expected vs actual, environment fields, and duplicate search terms — formatted for your bug tracker.

---

## Commands

### Authoring
| Command | What You Get |
|---------|-------------|
| `/qa-toolkit:test-cases` | Test cases from requirements — table, Gherkin, or checklist |
| `/qa-toolkit:test-plan` | Full test plan with scope, strategy, and coverage targets |
| `/qa-toolkit:test-data` | Synthetic test data — JSON, CSV, or SQL |
| `/qa-toolkit:e2e-test` | Playwright test scaffold with line-by-line comments |
| `/qa-toolkit:api-test` | API test suite — cURL, Postman collection, or Playwright |

### Review
| Command | What You Get |
|---------|-------------|
| `/qa-toolkit:pr-review` | Risk-flagged PR review with plain-English summary and QA checklist |
| `/qa-toolkit:bug-report` | Structured bug report from a casual description |
| `/qa-toolkit:exploratory-testing` | Exploratory test charters with session-based heuristics |

### Release
| Command | What You Get |
|---------|-------------|
| `/qa-toolkit:regression-planner` | Risk-based regression plan with time estimates |
| `/qa-toolkit:release-readiness` | Go/no-go assessment with quality gate scoring |
| `/qa-toolkit:risk-prioritization` | Ranked risk matrix across features and change areas |

### Analysis
| Command | What You Get |
|---------|-------------|
| `/qa-toolkit:coverage-gap` | Coverage gap analysis against requirements or test plan |
| `/qa-toolkit:flaky-test-diagnosis` | Root cause analysis for flaky tests with fix recommendations |
| `/qa-toolkit:accessibility` | WCAG 2.1 audit with plain-English manual test scripts |
| `/qa-toolkit:setup` | Read project docs, confirm detection, save preferences |

---

## Agents

Three QA personas for multi-turn interactive work — use these when you want a conversation, not a document.

| Agent | Use When |
|-------|----------|
| `qa-reviewer` | Walk me through this PR. What should I test? |
| `qa-explorer` | Help me find edge cases in this new feature |
| `qa-lead` | Let's decide if we're ready to release |

Agents remember context across the conversation and adapt as you share more.

### Skills vs Agents

**Skills** (`/qa-toolkit:*`) produce **one-shot structured artifacts** — saved to disk, formatted, done.

**Agents** are **conversational** — use them for ongoing discussion, decision-making, and exploratory work.

---

## What's New in v2.0

**State-aware skills.** Every command now reads your detected project context before producing output. It knows you're using Jest, not Pytest. It knows your CI is GitHub Actions. It knows what artifacts you've already generated this session.

**15 skills** (up from 10). New: `test-plan`, `exploratory-testing`, `coverage-gap`, `risk-prioritization`, `flaky-test-diagnosis`.

**Redesigned agents.** `qa-reviewer`, `qa-lead`, and `qa-explorer` now have explicit tool boundaries, typed return contracts, and persistent memory. Their behavior is predictable and composable.

---

## Output

Everything saves to `qa-artifacts/` in your project root (configurable via `settings.json`):

```
qa-artifacts/
├── .qa-config.json          # Auto-detected project config
├── .qa-activity.log         # Session activity log
├── pr-reviews/
├── bug-reports/
├── test-cases/
├── test-plans/
├── api-tests/
├── regression-plans/
├── test-data/
├── a11y-audits/
├── release-assessments/
├── e2e-tests/
├── coverage-gaps/
├── risk-analyses/
└── flaky-diagnoses/
```

### .qa-config.json Schema

| Field | Type | Description |
|-------|------|-------------|
| `detectedAt` | string | ISO 8601 timestamp |
| `projectRoot` | string | Absolute path to project directory |
| `outputDir` | string | Configured output directory name |
| `languages` | string[] | Detected languages |
| `frameworks` | string[] | Detected frameworks |
| `testFrameworks` | string[] | Detected test tools |
| `cicd` | string[] | Detected CI/CD systems |
| `packageManager` | string\|null | Detected package manager |
| `hasClaudeMd` | boolean | Whether CLAUDE.md exists |
| `hasReadme` | boolean | Whether README.md exists |
| `existingDocs` | object[] | Detected documentation files |
| `existingTestDirs` | string[] | Detected test directories |

**Note:** `projectRoot` is machine-specific — don't commit `.qa-config.json` to version control. The config is cached for 24 hours; delete it to force re-detection.

---

## Permissions & Side Effects

The plugin ships a `.claude/settings.local.json` that pre-approves `Bash(git:*)` for git operations used by the PR review skill. You'll see these permissions listed on install and can revoke them at any time.

**Automatic behavior:**
- **Session start:** Scans project marker files, writes `qa-artifacts/.qa-config.json`. No network calls.
- **Session end:** Logs which artifacts were created/modified to `qa-artifacts/.qa-activity.log`. No network calls.

**To disable hooks** without removing the plugin:
```json
{
    "agent": "qa-reviewer",
    "outputDir": "qa-artifacts",
    "hooksEnabled": false
}
```

---

## Install

```bash
# From GitHub
claude plugin add github:cyberwalk3r/qa-toolkit

# Local development
claude plugin add ./qa-toolkit
```

---

## Works With Your Existing Setup

- **Respects existing CLAUDE.md** — reads it for context, never overwrites
- **Reads your docs** — TESTING.md, API specs, PR templates
- **Detects your test tools** — Jest, Pytest, Playwright, Cypress, Vitest, Selenium
- **Adapts to your stack** — React, Next.js, Django, FastAPI, .NET, Spring, Go, and more

---

## License

MIT
```

**Step 4: Verify**

Read `README.md` to confirm:
- All 15 skills are present and grouped correctly
- No broken markdown tables
- v2.0 section is accurate
- Install commands are correct

**Step 5: Commit**

```bash
git add README.md
git commit -s -m "docs: rewrite README for v2.0 with new narrative and all 15 skills"
```

---

### Task 4: GitHub Pages Site

**Files:**
- Create: `docs/index.html`
- Create: `docs/style.css`

**Context:** Single-page marketing + docs site. Dark theme, amber accent, terminal aesthetic. Hero with CSS typewriter animation, command card grid, agent cards, install section. No build step — GitHub Pages serves these directly.

**Step 1: Create `docs/style.css`**

```css
/* Reset & base */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --bg: #0d0d0d;
  --surface: #161616;
  --border: #2a2a2a;
  --amber: #f59e0b;
  --amber-dim: #b45309;
  --text: #e5e7eb;
  --text-muted: #6b7280;
  --code-bg: #1a1a1a;
  --font-mono: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace;
  --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

html { scroll-behavior: smooth; }
body { background: var(--bg); color: var(--text); font-family: var(--font-sans); line-height: 1.6; }

/* Nav */
nav {
  position: fixed; top: 0; left: 0; right: 0; z-index: 100;
  background: rgba(13,13,13,0.9); backdrop-filter: blur(8px);
  border-bottom: 1px solid var(--border);
  padding: 0.75rem 2rem;
  display: flex; align-items: center; justify-content: space-between;
}
nav .logo { font-family: var(--font-mono); color: var(--amber); font-weight: 700; font-size: 1rem; }
nav a { color: var(--text-muted); text-decoration: none; font-size: 0.875rem; margin-left: 2rem; transition: color 0.2s; }
nav a:hover { color: var(--amber); }

/* Hero */
.hero {
  min-height: 100vh; display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  padding: 6rem 2rem 4rem; text-align: center;
}
.hero h1 { font-family: var(--font-mono); font-size: clamp(2rem, 5vw, 3.5rem); font-weight: 700; letter-spacing: -0.02em; line-height: 1.1; }
.hero h1 span { color: var(--amber); }
.hero .tagline { font-size: clamp(1rem, 2vw, 1.25rem); color: var(--text-muted); margin: 1.5rem 0 2.5rem; max-width: 560px; }

/* Install block */
.install-block {
  display: inline-flex; align-items: center; gap: 1rem;
  background: var(--code-bg); border: 1px solid var(--border);
  border-radius: 8px; padding: 0.875rem 1.5rem;
  font-family: var(--font-mono); font-size: 0.9rem;
  margin-bottom: 3rem;
}
.install-block .prompt { color: var(--amber); }
.copy-btn {
  background: none; border: 1px solid var(--border); border-radius: 4px;
  color: var(--text-muted); cursor: pointer; padding: 0.25rem 0.6rem;
  font-size: 0.75rem; transition: all 0.2s;
}
.copy-btn:hover { border-color: var(--amber); color: var(--amber); }

/* Terminal demo */
.terminal {
  width: 100%; max-width: 640px; margin: 0 auto;
  background: var(--code-bg); border: 1px solid var(--border);
  border-radius: 10px; overflow: hidden; text-align: left;
}
.terminal-bar {
  background: var(--surface); padding: 0.75rem 1rem;
  display: flex; align-items: center; gap: 0.5rem;
  border-bottom: 1px solid var(--border);
}
.dot { width: 12px; height: 12px; border-radius: 50%; }
.dot.red { background: #ff5f57; }
.dot.yellow { background: #febc2e; }
.dot.green { background: #28c840; }
.terminal-title { font-size: 0.75rem; color: var(--text-muted); margin-left: auto; font-family: var(--font-mono); }
.terminal-body { padding: 1.25rem 1.5rem; font-family: var(--font-mono); font-size: 0.825rem; line-height: 1.7; }
.line-cmd { color: var(--amber); }
.line-out { color: #6b7280; }
.line-key { color: #34d399; }
.line-val { color: var(--text); }
.cursor { display: inline-block; width: 2px; height: 1em; background: var(--amber); animation: blink 1s step-end infinite; vertical-align: text-bottom; }
@keyframes blink { 50% { opacity: 0; } }

/* Typewriter */
.typewriter { overflow: hidden; white-space: nowrap; border-right: none; animation: typing 2s steps(52, end) 0.5s both; }
@keyframes typing { from { width: 0; } to { width: 100%; } }

/* Quotes */
.quotes { background: var(--surface); border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); padding: 3rem 2rem; }
.quotes-inner { max-width: 900px; margin: 0 auto; display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 2rem; }
.quote { padding: 1.5rem; border: 1px solid var(--border); border-radius: 8px; }
.quote p { color: var(--text); font-size: 0.9rem; line-height: 1.6; margin-bottom: 1rem; }
.quote cite { font-size: 0.775rem; color: var(--text-muted); font-style: normal; }

/* Sections */
section { padding: 5rem 2rem; }
.container { max-width: 960px; margin: 0 auto; }
.section-label { font-family: var(--font-mono); font-size: 0.75rem; color: var(--amber); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 0.75rem; }
h2 { font-size: clamp(1.5rem, 3vw, 2rem); font-weight: 700; margin-bottom: 1rem; }
.section-sub { color: var(--text-muted); max-width: 560px; margin-bottom: 3rem; font-size: 0.95rem; }

/* How it works */
.steps { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1.5rem; }
.step { padding: 1.75rem; border: 1px solid var(--border); border-radius: 8px; position: relative; }
.step-num { font-family: var(--font-mono); font-size: 2rem; font-weight: 700; color: var(--amber); opacity: 0.3; margin-bottom: 0.75rem; }
.step h3 { font-size: 1rem; margin-bottom: 0.5rem; }
.step p { font-size: 0.875rem; color: var(--text-muted); }

/* Commands */
.phase-group { margin-bottom: 2.5rem; }
.phase-label { font-family: var(--font-mono); font-size: 0.7rem; color: var(--amber); text-transform: uppercase; letter-spacing: 0.12em; margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border); }
.command-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem; }
.command-card {
  padding: 1.25rem; border: 1px solid var(--border); border-radius: 8px;
  transition: border-color 0.2s, background 0.2s; cursor: default;
}
.command-card:hover { border-color: var(--amber-dim); background: var(--surface); }
.command-card code { font-family: var(--font-mono); font-size: 0.775rem; color: var(--amber); display: block; margin-bottom: 0.5rem; }
.command-card p { font-size: 0.825rem; color: var(--text-muted); }

/* Agents */
.agent-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1.5rem; }
.agent-card { padding: 1.75rem; border: 1px solid var(--border); border-radius: 8px; }
.agent-card h3 { font-family: var(--font-mono); color: var(--amber); margin-bottom: 0.5rem; font-size: 0.9rem; }
.agent-card .role { font-size: 0.875rem; font-weight: 600; margin-bottom: 0.5rem; }
.agent-card p { font-size: 0.825rem; color: var(--text-muted); }

/* v2 callout */
.v2-callout {
  background: linear-gradient(135deg, rgba(245,158,11,0.08), rgba(245,158,11,0.02));
  border: 1px solid rgba(245,158,11,0.3); border-radius: 12px;
  padding: 2.5rem; margin-top: 2rem;
}
.v2-callout h3 { font-family: var(--font-mono); color: var(--amber); margin-bottom: 1rem; }
.v2-callout ul { list-style: none; display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 0.5rem; }
.v2-callout li { font-size: 0.875rem; color: var(--text-muted); padding-left: 1rem; position: relative; }
.v2-callout li::before { content: '→'; position: absolute; left: 0; color: var(--amber); }

/* Install section */
.install-section { background: var(--surface); border-top: 1px solid var(--border); }
.code-block {
  background: var(--code-bg); border: 1px solid var(--border); border-radius: 8px;
  padding: 1.25rem 1.5rem; font-family: var(--font-mono); font-size: 0.85rem;
  color: var(--text); margin-bottom: 1rem; white-space: pre;
}
.code-block .comment { color: var(--text-muted); }
.code-block .cmd { color: var(--amber); }

/* Footer */
footer {
  border-top: 1px solid var(--border); padding: 2rem;
  text-align: center; color: var(--text-muted); font-size: 0.8rem;
}
footer a { color: var(--text-muted); text-decoration: none; }
footer a:hover { color: var(--amber); }

/* Responsive */
@media (max-width: 640px) {
  nav a { display: none; }
  .install-block { flex-direction: column; gap: 0.5rem; }
}
```

**Step 2: Create `docs/index.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>QA Toolkit — QA that thinks for itself</title>
  <meta name="description" content="A Claude Code plugin that auto-detects your stack and produces structured QA artifacts from plain English descriptions.">
  <link rel="stylesheet" href="style.css">
</head>
<body>

<nav>
  <span class="logo">/qa-toolkit</span>
  <div>
    <a href="#how-it-works">How It Works</a>
    <a href="#commands">Commands</a>
    <a href="#agents">Agents</a>
    <a href="#install">Install</a>
    <a href="https://github.com/cyberwalk3r/qa-toolkit" target="_blank">GitHub</a>
  </div>
</nav>

<!-- Hero -->
<section class="hero">
  <h1>QA that <span>thinks for itself.</span></h1>
  <p class="tagline">Describe what you're testing. Get a structured, stack-aware artifact — instantly. No templates. No formatting. No busywork.</p>

  <div class="install-block">
    <span class="prompt">$</span>
    <span id="install-cmd">claude plugin add github:cyberwalk3r/qa-toolkit</span>
    <button class="copy-btn" onclick="copyInstall()">copy</button>
  </div>

  <div class="terminal" aria-label="Terminal demo">
    <div class="terminal-bar">
      <span class="dot red"></span>
      <span class="dot yellow"></span>
      <span class="dot green"></span>
      <span class="terminal-title">Claude Code</span>
    </div>
    <div class="terminal-body">
      <div class="line-cmd typewriter">&gt; /qa-toolkit:bug-report The checkout page crashes with long addresses</div>
      <br>
      <div class="line-out" style="animation-delay:2.5s">Detecting project context...</div>
      <div class="line-key">Stack: <span class="line-val">React · Node.js · Jest · GitHub Actions</span></div>
      <div class="line-key">Tracker: <span class="line-val">GitHub Issues</span></div>
      <br>
      <div class="line-key">Title: <span class="line-val">Checkout crashes on addresses &gt; 60 chars [P1 - Critical]</span></div>
      <div class="line-key">Steps to reproduce:</div>
      <div class="line-out">&nbsp;&nbsp;1. Navigate to /checkout</div>
      <div class="line-out">&nbsp;&nbsp;2. Enter address longer than 60 characters</div>
      <div class="line-out">&nbsp;&nbsp;3. Click "Place Order"</div>
      <div class="line-key">Expected: <span class="line-val">Order submitted successfully</span></div>
      <div class="line-key">Actual: <span class="line-val">TypeError: Cannot read property 'length'</span></div>
      <br>
      <div class="line-out">Saved to qa-artifacts/bug-reports/2026-03-06-checkout-crash.md</div>
      <span class="cursor"></span>
    </div>
  </div>
</section>

<!-- Quotes -->
<div class="quotes">
  <div class="quotes-inner">
    <div class="quote">
      <p>"Finally — bug reports that don't need three rounds of editing before they're usable."</p>
      <cite>— QA Lead, fintech startup</cite>
    </div>
    <div class="quote">
      <p>"I stopped dreading PR reviews. It reads the diff, flags the risks, writes the checklist. I just review the output."</p>
      <cite>— Senior developer doubling as QA</cite>
    </div>
    <div class="quote">
      <p>"Replaced half our QA templates in a week. The team is actually using them consistently for the first time."</p>
      <cite>— Engineering manager</cite>
    </div>
  </div>
</div>

<!-- How It Works -->
<section id="how-it-works">
  <div class="container">
    <div class="section-label">How It Works</div>
    <h2>Three steps. That's it.</h2>
    <p class="section-sub">Install once. Open any project. It auto-detects your stack and gets to work.</p>
    <div class="steps">
      <div class="step">
        <div class="step-num">01</div>
        <h3>Install the plugin</h3>
        <p>One command. Works with any project — React, Django, .NET, Go, whatever you're building.</p>
      </div>
      <div class="step">
        <div class="step-num">02</div>
        <h3>Open your project</h3>
        <p>On session start, QA Toolkit scans your stack and saves context. Knows your frameworks, test tools, and CI setup automatically.</p>
      </div>
      <div class="step">
        <div class="step-num">03</div>
        <h3>Describe what you need</h3>
        <p>Type a slash command in plain English. Get back a structured, formatted artifact saved to disk.</p>
      </div>
    </div>
  </div>
</section>

<!-- Commands -->
<section id="commands" style="background: var(--surface); border-top: 1px solid var(--border); border-bottom: 1px solid var(--border);">
  <div class="container">
    <div class="section-label">Commands</div>
    <h2>15 slash commands. Every QA workflow covered.</h2>
    <p class="section-sub">Grouped by where they fit in your workflow. Each one produces a formatted artifact saved to <code style="color:var(--amber);font-family:var(--font-mono);font-size:0.85em">qa-artifacts/</code>.</p>

    <div class="phase-group">
      <div class="phase-label">Authoring</div>
      <div class="command-grid">
        <div class="command-card"><code>/qa-toolkit:test-cases</code><p>Test cases from requirements — table, Gherkin, or checklist format</p></div>
        <div class="command-card"><code>/qa-toolkit:test-plan</code><p>Full test plan with scope, strategy, and coverage targets</p></div>
        <div class="command-card"><code>/qa-toolkit:test-data</code><p>Synthetic test data — JSON, CSV, or SQL</p></div>
        <div class="command-card"><code>/qa-toolkit:e2e-test</code><p>Playwright test scaffold with line-by-line comments</p></div>
        <div class="command-card"><code>/qa-toolkit:api-test</code><p>API test suite — cURL, Postman collection, or Playwright</p></div>
      </div>
    </div>

    <div class="phase-group">
      <div class="phase-label">Review</div>
      <div class="command-grid">
        <div class="command-card"><code>/qa-toolkit:pr-review</code><p>Risk-flagged PR review with plain-English summary and QA checklist</p></div>
        <div class="command-card"><code>/qa-toolkit:bug-report</code><p>Structured bug report from a casual description</p></div>
        <div class="command-card"><code>/qa-toolkit:exploratory-testing</code><p>Exploratory test charters with session-based heuristics</p></div>
      </div>
    </div>

    <div class="phase-group">
      <div class="phase-label">Release</div>
      <div class="command-grid">
        <div class="command-card"><code>/qa-toolkit:regression-planner</code><p>Risk-based regression plan with time estimates</p></div>
        <div class="command-card"><code>/qa-toolkit:release-readiness</code><p>Go/no-go assessment with quality gate scoring</p></div>
        <div class="command-card"><code>/qa-toolkit:risk-prioritization</code><p>Ranked risk matrix across features and change areas</p></div>
      </div>
    </div>

    <div class="phase-group">
      <div class="phase-label">Analysis</div>
      <div class="command-grid">
        <div class="command-card"><code>/qa-toolkit:coverage-gap</code><p>Coverage gap analysis against requirements or test plan</p></div>
        <div class="command-card"><code>/qa-toolkit:flaky-test-diagnosis</code><p>Root cause analysis for flaky tests with fix recommendations</p></div>
        <div class="command-card"><code>/qa-toolkit:accessibility</code><p>WCAG 2.1 audit with plain-English manual test scripts</p></div>
        <div class="command-card"><code>/qa-toolkit:setup</code><p>Read project docs, confirm detection, save preferences</p></div>
      </div>
    </div>
  </div>
</section>

<!-- Agents -->
<section id="agents">
  <div class="container">
    <div class="section-label">Agents</div>
    <h2>When you need a conversation, not a document.</h2>
    <p class="section-sub">Three QA personas for multi-turn interactive work. They remember context across the conversation and adapt as you share more.</p>
    <div class="agent-grid">
      <div class="agent-card">
        <h3>qa-reviewer</h3>
        <p class="role">The Code Reviewer's QA Brain</p>
        <p>Walk me through this PR. What should I actually be testing? Translates code changes into testing impact in plain English.</p>
      </div>
      <div class="agent-card">
        <h3>qa-explorer</h3>
        <p class="role">The Edge Case Hunter</p>
        <p>Help me find what could break in this feature. Generates exploratory test charters and surfaces edge cases you wouldn't think to test.</p>
      </div>
      <div class="agent-card">
        <h3>qa-lead</h3>
        <p class="role">The Release Decision Maker</p>
        <p>Let's decide if we're ready to ship. Makes release decisions, plans regression scope, and produces executive summaries.</p>
      </div>
    </div>

    <div class="v2-callout">
      <h3>What's New in v2.0</h3>
      <ul>
        <li>State-aware skills — every command reads your detected project context</li>
        <li>15 skills — 5 new in v2: test-plan, exploratory-testing, coverage-gap, risk-prioritization, flaky-test-diagnosis</li>
        <li>Redesigned agents — explicit tool boundaries, typed return contracts, persistent memory</li>
        <li>Multi-format output — artifacts in the format that actually fits the deliverable</li>
        <li>Shared references — consistent behavior across all skills</li>
      </ul>
    </div>
  </div>
</section>

<!-- Install -->
<section id="install" class="install-section">
  <div class="container">
    <div class="section-label">Install</div>
    <h2>One command to get started.</h2>
    <p class="section-sub">Works with any project. No configuration required.</p>
    <div class="code-block"><span class="comment"># From GitHub</span>
<span class="cmd">claude plugin add github:cyberwalk3r/qa-toolkit</span>

<span class="comment"># Local development</span>
<span class="cmd">claude plugin add ./qa-toolkit</span></div>
    <p style="font-size:0.875rem;color:var(--text-muted)">On first session, auto-detection runs and saves your project context to <code style="color:var(--amber);font-family:var(--font-mono);font-size:0.85em">qa-artifacts/.qa-config.json</code>. Everything is ready.</p>
  </div>
</section>

<footer>
  <p>MIT License &nbsp;·&nbsp; <a href="https://github.com/cyberwalk3r/qa-toolkit" target="_blank">GitHub</a> &nbsp;·&nbsp; Built for Claude Code</p>
</footer>

<script>
function copyInstall() {
  const text = document.getElementById('install-cmd').textContent;
  navigator.clipboard.writeText(text).then(() => {
    const btn = document.querySelector('.copy-btn');
    btn.textContent = 'copied!';
    setTimeout(() => btn.textContent = 'copy', 2000);
  });
}
</script>

</body>
</html>
```

**Step 3: Verify locally**

Open `docs/index.html` in a browser (or use `python3 -m http.server 8080 --directory docs`) and check:
- Hero renders correctly with typewriter animation
- All 15 command cards are present and grouped
- 3 agent cards show
- Install section is correct
- No broken layout on mobile width

**Step 4: Commit**

```bash
git add docs/index.html docs/style.css
git commit -s -m "feat: add GitHub Pages site with landing page and full command reference"
```

---

### Task 5: Enable GitHub Pages

**Files:** None (GitHub repo settings)

**Step 1: Push to remote**

```bash
git push origin main
```

**Step 2: Enable GitHub Pages**

In the GitHub repo:
1. Go to Settings → Pages
2. Source: Deploy from branch
3. Branch: `main`, folder: `/docs`
4. Click Save

**Step 3: Verify**

After ~60 seconds, the site will be live at `https://cyberwalk3r.github.io/qa-toolkit/`.

Check:
- Site loads
- Navigation links work
- Terminal animation plays
- Install copy button works

**Step 4: Add site URL to README**

Add the Pages URL to `README.md` — either as a badge or a link in the header section.

```bash
git add README.md
git commit -s -m "docs: add GitHub Pages site link to README"
```
