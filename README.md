<div align="center">

# QA Toolkit

**Test the code. Trust the release.**

15 QA commands for Claude Code — test cases, PR reviews, bug reports, and more. Auto-detects your stack. Zero config.

[![Plugin](https://img.shields.io/badge/claude--plugin-qa--toolkit-blue?style=for-the-badge)](https://github.com/cyberwalk3r/qa-toolkit)
[![License](https://img.shields.io/badge/license-MIT-green?style=for-the-badge)](LICENSE)
[![CI](https://img.shields.io/github/actions/workflow/status/cyberwalk3r/qa-toolkit/test.yml?branch=main&style=for-the-badge&label=Tests)](https://github.com/cyberwalk3r/qa-toolkit/actions)

<br>

```bash
claude plugin add github:cyberwalk3r/qa-toolkit
```

<br>

</div>

---

## Why QA Toolkit

**Bug reports in seconds.** Describe what broke. Get back severity classification, steps to reproduce, expected vs actual, and environment fields — formatted for your tracker, not a generic template.

**PR reviews that actually help.** It reads the diff, maps which files touch which user flows, and writes a QA checklist grounded in what actually changed — not a checklist you've seen a hundred times.

**Artifacts that fit your stack.** It knows you're using Jest, not Pytest. It knows your CI runs on GitHub Actions. The output matches what your team already does, automatically.

---

## How It Works

### 1. Install the plugin

One command. Works with any project — React, Django, .NET, Go, whatever you're building.

```bash
claude plugin add github:cyberwalk3r/qa-toolkit
```

### 2. Open your project

On session start, QA Toolkit scans your stack and saves context. Knows your frameworks, test tools, and CI setup automatically.

### 3. Describe what you need

Type a slash command in plain English. Because it already knows your stack, the output uses the right format, the right frameworks, the right test runner.

```
/qa-toolkit:bug-report The checkout page crashes when I enter a long address
```

---

## Workflow

Skills chain together. Each one feeds the next.

```
setup ──► pr-review ──► regression-planner ──► release-readiness
               │                  │
               ▼                  ▼
          bug-report          test-cases ──► e2e-test
                                  │
                                  ▼
                              test-data
```

Start anywhere — every command works standalone. But chaining builds richer, state-aware context.

Run `/qa-toolkit:setup` first to confirm your detected stack, then follow the **Suggested Next Steps** at the bottom of each artifact.

---

## Commands

### Authoring
| Command | What You Get |
|---------|-------------|
| `/qa-toolkit:test-cases` | Test cases from requirements — table, Gherkin, or checklist format |
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

When you need a conversation, not a document.

Three QA personas for multi-turn interactive work. They remember context across the conversation and adapt as you share more.

| Agent | Role | What It Does |
|-------|------|-------------|
| `qa-reviewer` | The Code Reviewer's QA Brain | Walk me through this PR. What should I actually be testing? Translates code changes into testing impact in plain English. |
| `qa-explorer` | The Edge Case Hunter | Help me find what could break in this feature. Generates exploratory test charters and surfaces edge cases you wouldn't think to test. |
| `qa-lead` | The Release Decision Maker | Let's decide if we're ready to ship. Makes release decisions, plans regression scope, and produces executive summaries. |

### Skills vs Agents

**Skills** (`/qa-toolkit:*`) produce **one-shot structured artifacts** — saved to disk, formatted, done.

**Agents** are **conversational** — use them for ongoing discussion, decision-making, and exploratory work.

> **When to pick an agent:** Use `qa-reviewer` when walking through a PR interactively. Use `qa-explorer` when brainstorming edge cases for a feature. Use `qa-lead` when deciding whether a release is ready to ship. If you want a saved artifact instead of a conversation, use the corresponding skill.

---

## Built for Real QA Workflows

- **State-aware skills** — every command reads your detected project context
- **15 skills** covering authoring, review, release, and analysis
- **3 agents** with explicit tool boundaries, typed return contracts, and persistent memory
- **Multi-format output** — artifacts in the format that actually fits the deliverable
- **Shared references** — consistent behavior across all skills

---

## Output

Everything saves to `qa-artifacts/` in your project root (configurable via `settings.json`). Add it to `.gitignore` if you don't want to commit QA artifacts.

### settings.json

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `agent` | string | `"qa-reviewer"` | Default agent persona for interactive sessions |
| `outputDir` | string | `"qa-artifacts"` | Output directory (relative path, no `..`) |
| `hooksEnabled` | boolean | `true` | Enable/disable SessionStart and Stop hooks |
| `detectionBudgetMs` | number | `500` | Time budget (ms) for project auto-detection phases |

### Artifact structure

```
qa-artifacts/
├── .qa-context.json         # Auto-detected project config (project state)
├── .qa-session.json          # Current session state
├── .qa-activity.log          # Session activity log
├── sessions/                 # Archived session files
├── a11y-audits/
├── api-tests/
├── bug-reports/
├── coverage-analysis/
├── e2e-tests/
├── exploratory/
├── flaky-diagnosis/
├── pr-reviews/
├── regression-plans/
├── release-assessments/
├── risk-analysis/
├── test-cases/
├── test-data/
└── test-plans/
```

### .qa-context.json Schema (Project State)

Top-level fields:

| Field | Type | Description |
|-------|------|-------------|
| `schemaVersion` | number | Schema version (currently `1`) |
| `detectedAt` | string | ISO 8601 timestamp of last detection |
| `projectRoot` | string | Absolute path to project directory |
| `outputDir` | string | Configured output directory name |
| `detection` | object | Auto-detected project info (see below) |
| `conventions` | object | Formatting, linting, TypeScript, test patterns |
| `detectionTiming` | object | Phase timing and budget data |
| `risks` | object[] | Accumulated risk findings across sessions |
| `coverageGaps` | object[] | Accumulated coverage gap findings |
| `testingConventions` | object[] | Project testing conventions |
| `historicalFindings` | object | Session counts, bugs reported, areas reviewed |

`detection` sub-fields:

| Field | Type | Description |
|-------|------|-------------|
| `detection.languages` | string[] | Detected languages |
| `detection.frameworks` | string[] | Detected frameworks |
| `detection.testFrameworks` | string[] | Detected test tools |
| `detection.cicd` | string[] | Detected CI/CD systems |
| `detection.packageManager` | string\|null | Detected package manager |
| `detection.hasClaudeMd` | boolean | Whether CLAUDE.md exists |
| `detection.hasReadme` | boolean | Whether README.md exists |
| `detection.existingDocs` | object[] | Detected documentation files |
| `detection.existingTestDirs` | string[] | Detected test directories |
| `detection.monorepo` | object\|null | Workspace tool, config file, packages |

**Note:** `projectRoot` is machine-specific — don't commit `.qa-context.json` to version control. Delete it to force re-detection.

### .qa-session.json Schema (Session State)

| Field | Type | Description |
|-------|------|-------------|
| `schemaVersion` | number | Schema version (currently `1`) |
| `startedAt` | string | ISO 8601 timestamp of session start |
| `featureUnderTest` | string\|null | Current feature being tested |
| `sessionGoal` | string\|null | Declared goal for this session |
| `findings` | object[] | Accumulated findings (appended by skills) |
| `skillHistory` | object[] | Record of skills executed this session |

`findings` entry:

| Field | Type | Description |
|-------|------|-------------|
| `area` | string | Feature or module area |
| `type` | string | Finding type (e.g., `bug`, `coverage-gap`, `risk`, `pr-review`) |
| `summary` | string | One-line summary of the finding |

`skillHistory` entry:

| Field | Type | Description |
|-------|------|-------------|
| `skill` | string | Skill name (e.g., `test-cases`, `pr-review`) |
| `feature` | string | Feature that was tested |
| `timestamp` | string | ISO 8601 timestamp |

Additional fields vary by skill (e.g., `testCaseCount`, `riskLevel`, `affectedAreas`). Session state is archived to `qa-artifacts/sessions/` on session end.

---

## Advanced: State Management

Skills and hooks use `scripts/state-manager.js` to read and write QA state. You can also use it directly to inspect or modify state.

```bash
# Read full project or session state
node scripts/state-manager.js read project
node scripts/state-manager.js read session

# Read a specific field
node scripts/state-manager.js read project risks
node scripts/state-manager.js read session featureUnderTest

# Write a field (replaces value; appends for session findings/skillHistory)
node scripts/state-manager.js write session featureUnderTest '"login flow"'
node scripts/state-manager.js write session findings '{"type":"bug","area":"auth"}'

# Merge into an array field (deduplicates by key)
node scripts/state-manager.js merge project risks '{"area":"auth","severity":"high"}'

# Initialize a fresh session (archives existing if it has content)
node scripts/state-manager.js init session

# Archive current session to qa-artifacts/sessions/
node scripts/state-manager.js archive session
```

State files: `qa-artifacts/.qa-context.json` (project), `qa-artifacts/.qa-session.json` (session). Both use atomic writes and schema versioning.

---

## Permissions & Side Effects

On first use, Claude Code will prompt you to approve each permission the plugin needs. You can approve, deny, or revoke permissions at any time. The plugin requires:

| Permission | Used by |
|------------|---------|
| `Bash(git diff:*)` | PR review skill — reads PR diff |
| `Bash(git log:*)` | PR review skill — reads commit history |
| `Bash(git show:*)` | PR review skill — reads commit details |
| `Bash(git branch:*)` | PR review skill — lists branches |
| `Bash(git status:*)` | PR review skill — reads working tree state |
| `Bash(git fetch:*)` | PR review skill — updates remote refs for comparison |
| `Bash(node scripts/detect-project.js:*)` | SessionStart hook — project detection |
| `Bash(node scripts/session-hook.js:*)` | Stop hook — session archiving and activity log |
| `Bash(node scripts/state-manager.js:*)` | All skills — reading and writing QA state |
| `Bash(node scripts/run-test.js:*)` | e2e-test skill — Playwright test executor wrapper (validates args, invokes `npx playwright test`) |
| `Bash(npx playwright test:*)` | e2e-test skill — runs generated Playwright tests (user-initiated only) |

**No network access.** All scripts use Node.js stdlib only — zero external dependencies, zero network calls.

**Automatic behavior:**
- **Session start:** Scans project marker files (languages, frameworks, test tools, CI/CD), writes `qa-artifacts/.qa-context.json`. If `CLAUDE.md` exists, reads the first 50 lines to detect project conventions (stored in `.qa-context.json` as `detection.existingQaConfig.claudeMdSummary` — no content is sent externally).
- **Session end:** Promotes session findings to project state, archives the session, logs which artifacts were created/modified to `qa-artifacts/.qa-activity.log`.

**Output directory:** All artifacts are written to `qa-artifacts/` in your project root. This directory is runtime-generated and should be gitignored — add `qa-artifacts/` to your project's `.gitignore` if you don't want to commit QA artifacts.

**Preview detection without writing files:**
```bash
node scripts/detect-project.js --dry-run
```

**Verbose detection with timing and phase info:**
```bash
node scripts/detect-project.js --verbose
```

**To disable hooks** without removing the plugin, set `hooksEnabled` to `false` in `settings.json`:
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

On first use, Claude Code will prompt you to approve the plugin's hook scripts and read-only git commands. See the [Permissions & Side Effects](#permissions--side-effects) section for the full list.

---

## Detection Limitations

Auto-detection uses lightweight marker-file scanning with a configurable time budget (default 500ms). Phases that exceed the budget are skipped gracefully. Known limitations:

- **Workspace config parsing** (`pnpm-workspace.yaml`, `Cargo.toml` workspaces, `go.work`, `pyproject.toml`) uses simplified regex-based parsers. Unusual formatting (inline comments, multi-line strings) may not be recognized. If detection misses your monorepo layout, run `/qa-toolkit:setup` to correct it manually.
- **Glob-based language detection** (e.g., `*.csproj`) scans up to 3 directory levels deep. Deeply nested projects may not be detected.
- **Activity log rotation** triggers at 512 KB, keeping the most recent half of entries. Long-running projects won't accumulate unbounded log files.

Use `--verbose` to see which detection phases ran, which were skipped, and how long each took:
```bash
node scripts/detect-project.js --verbose
```

---

## Works With Your Existing Setup

- **Respects existing CLAUDE.md** — reads it for context, never overwrites
- **Reads your docs** — TESTING.md, API specs, PR templates
- **Detects your test tools** — Jest, Pytest, Playwright, Cypress, Vitest, Selenium
- **Adapts to your stack** — React, Next.js, Django, FastAPI, .NET, Spring, Go, and more

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, conventions, and pull request guidelines.

---

## License

MIT
