<div align="center">

# QA Toolkit

**QA that thinks for itself.**

Describe what you're testing. Get a structured, stack-aware artifact — instantly.

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

## Why I Built This

QA work is repetitive in the worst way. Every bug report needs the same structure. Every PR review needs the same checks. Every regression plan needs the same risk analysis. And every team member does it differently.

I wanted a tool that handles the formatting so you can focus on the judgment. Describe what you're testing in plain English — get back something you can actually use.

So I built QA Toolkit. It auto-detects your stack, remembers your project context, and produces consistent QA artifacts every time. Whether you're a dedicated QA lead or a developer wearing the QA hat, it adapts to your stack and your tracker without asking you to configure anything.

---

## How It Works

**1. Install the plugin**
```bash
claude plugin add github:cyberwalk3r/qa-toolkit
```

**2. Open any project**

On session start, QA Toolkit scans your project — languages, frameworks, test tools, CI/CD — and saves the context to `qa-artifacts/.qa-context.json`. No prompts. No setup.

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

| Agent | What It Does |
|-------|-------------|
| `qa-reviewer` | Reads PRs and translates code changes into testing impact — which user flows are at risk, what to test first, what's safe to skip |
| `qa-explorer` | Generates edge cases and exploratory charters from feature descriptions — finds the scenarios your requirements didn't think to mention |
| `qa-lead` | Makes release decisions, plans regression scope, and produces executive summaries — the QA voice in a release meeting |

Agents remember context across the conversation. The more you share, the sharper the output.

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
├── .qa-context.json         # Auto-detected project config and session state
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

### .qa-context.json Schema

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

**Note:** `projectRoot` is machine-specific — don't commit `.qa-context.json` to version control. Delete it to force re-detection.

---

## Permissions & Side Effects

The plugin ships a `.claude/settings.local.json` that pre-approves the following permissions:

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

You'll see these listed when you install the plugin and can revoke them at any time.

**Automatic behavior:**
- **Session start:** Scans project marker files (languages, frameworks, test tools, CI/CD), reads the first 50 lines of `CLAUDE.md` if present (to detect project conventions), writes `qa-artifacts/.qa-context.json`. No network calls.
- **Session end:** Promotes session findings to project state, archives the session, logs which artifacts were created/modified to `qa-artifacts/.qa-activity.log`. No network calls.

**Output directory:** All artifacts are written to `qa-artifacts/` in your project root. This directory is runtime-generated and should be gitignored — add `qa-artifacts/` to your project's `.gitignore` if you don't want to commit QA artifacts.

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

The plugin ships with `.claude/settings.local.json` that pre-approves its own hook scripts and read-only git commands so everything works on first use without confirmation prompts. See the [Permissions & Side Effects](#permissions--side-effects) section for the full list.

---

## Works With Your Existing Setup

- **Respects existing CLAUDE.md** — reads it for context, never overwrites
- **Reads your docs** — TESTING.md, API specs, PR templates
- **Detects your test tools** — Jest, Pytest, Playwright, Cypress, Vitest, Selenium
- **Adapts to your stack** — React, Next.js, Django, FastAPI, .NET, Spring, Go, and more

---

## License

MIT
