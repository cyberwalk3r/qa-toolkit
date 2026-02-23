# QA Toolkit

A Claude Code plugin that turns QA busywork into structured, consistent output.

You describe what you're testing in plain English. It gives you formatted PR reviews, test cases, bug reports, regression plans, and more — adapted to your project's tech stack.

## The Problem

QA testers spend hours formatting reports, writing bug tickets, building test matrices, and structuring PR feedback — work that's repetitive but has to be thorough every single time.

When the dev team ships 10 PRs a day, keeping up means cutting corners or burning out. And every team member formats things differently.

## What This Does

Install the plugin. Open any project. It auto-detects your stack (React, Python, .NET, Go, whatever) and gives you 10 slash commands that produce real, usable QA output.

**Example** — you type:
```
/qa-toolkit:bug-report The checkout page crashes when I enter a long address
```

You get back a fully structured bug report with severity classification, steps to reproduce, expected vs actual results, environment fields, and duplicate search terms — formatted for your bug tracker (Jira, GitHub Issues, Azure DevOps, Linear).

No prompt engineering. No copy-pasting templates. Just describe what happened.

## Commands

| Command | What You Get |
|---------|-------------|
| `/qa-toolkit:pr-review` | Risk-flagged PR review with plain-English summary and QA checklist |
| `/qa-toolkit:bug-report` | Structured bug report from a casual description |
| `/qa-toolkit:test-cases` | Test cases from requirements — table, Gherkin, or checklist format |
| `/qa-toolkit:api-test` | API test suite — cURL, Postman collection, or Playwright |
| `/qa-toolkit:e2e-test` | Playwright test scaffold with line-by-line comments |
| `/qa-toolkit:regression-planner` | Risk-based regression plan with time estimates |
| `/qa-toolkit:accessibility` | WCAG 2.1 audit with plain-English manual test scripts |
| `/qa-toolkit:release-readiness` | Go/no-go assessment with quality gate scoring |
| `/qa-toolkit:test-data` | Synthetic test data — JSON, CSV, or SQL |
| `/qa-toolkit:setup` | Read project docs, confirm detection, save preferences |

## Agents

Three QA personas available via `/agents`:

- **qa-reviewer** — Reads PRs and translates code changes into testing impact
- **qa-explorer** — Generates edge cases and exploratory test charters from feature descriptions
- **qa-lead** — Makes release decisions, plans regression scope, produces executive summaries

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

## Install

```bash
# From GitHub
claude plugin add github:cyberwalk3r/qa-toolkit

# Or test locally during development
claude plugin add ./qa-toolkit
```

That's it. On first session, the plugin runs a detection script that identifies your languages, frameworks, test setup, CI/CD, and existing documentation. Configuration is saved to `qa-artifacts/.qa-config.json`.

## Who This Is For

QA testers and team leads who:
- Review PRs but aren't writing the code
- Need consistent bug reports across the team
- Want test cases from requirements without starting from scratch
- Are keeping pace with fast-moving dev teams
- Don't have time to learn Playwright syntax but need E2E tests

## Output

Everything is saved to `qa-artifacts/` in your project root (configurable via `settings.json`):

```
qa-artifacts/
├── .qa-config.json          # Auto-detected project config
├── .qa-activity.log         # Session activity log
├── pr-reviews/              # PR review reports
├── bug-reports/             # Structured bug reports
├── test-cases/              # Generated test cases
├── api-tests/               # API test suites
├── regression-plans/        # Regression test plans
├── test-data/               # Synthetic test data
├── a11y-audits/             # Accessibility audit reports
├── release-assessments/     # Go/no-go assessments
└── e2e-tests/               # Playwright test scaffolds
```

### .qa-config.json Schema

The auto-detection hook writes a config file with the following fields:

| Field | Type | Description |
|-------|------|-------------|
| `detectedAt` | string | ISO 8601 timestamp of detection |
| `projectRoot` | string | Absolute path to the project directory |
| `outputDir` | string | Configured output directory name |
| `languages` | string[] | Detected languages (e.g., "JavaScript/TypeScript", "Python") |
| `frameworks` | string[] | Detected frameworks (e.g., "React", "FastAPI") |
| `testFrameworks` | string[] | Detected test tools (e.g., "Jest", "Playwright") |
| `cicd` | string[] | Detected CI/CD systems |
| `packageManager` | string\|null | Detected package manager |
| `hasClaudeMd` | boolean | Whether CLAUDE.md exists |
| `hasReadme` | boolean | Whether README.md exists |
| `existingDocs` | object[] | Detected documentation files with `path` and `type` |
| `existingTestDirs` | string[] | Detected test directories |
| `existingQaConfig.claudeMdSummary` | string | First 50 lines of CLAUDE.md (if present) |

**Note:** `projectRoot` contains the absolute path to your working directory. If your `.qa-config.json` is committed to version control, be aware this value is machine-specific. The config is cached for 24 hours; delete it to force re-detection.

## Permissions & Side Effects

The plugin ships a `.claude/settings.local.json` that pre-approves `Bash(git:*)` for git operations used by the PR review skill. This is Claude Code's standard permission mechanism — you'll see these permissions listed when you install the plugin and can revoke them at any time. No other elevated permissions are requested.

**Automatic behavior (hooks):**
- **On session start:** Scans your project for marker files (`package.json`, `requirements.txt`, etc.) to detect your tech stack. Creates `qa-artifacts/.qa-config.json` with the results. No network calls.
- **On session end:** Logs which artifacts were created/modified during the session to `qa-artifacts/.qa-activity.log`. No network calls.

Both hooks only read project marker files and write to the `qa-artifacts/` directory. No files outside that directory are created or modified.

**To disable hooks** without removing the plugin, set `"hooksEnabled": false` in the plugin's `settings.json`:

```json
{
    "agent": "qa-reviewer",
    "outputDir": "qa-artifacts",
    "hooksEnabled": false
}
```

All slash commands and agents continue to work — only the automatic detection and activity logging are disabled.

## Works With Your Existing Setup

- **Respects existing CLAUDE.md** — reads it for context, never overwrites
- **Reads your docs** — TESTING.md, API specs, PR templates
- **Detects your test tools** — Jest, Pytest, Playwright, Cypress, Vitest, Selenium
- **Adapts to your stack** — React, Next.js, Django, FastAPI, .NET, Spring, Go, and more

## License

MIT
