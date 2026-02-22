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

Everything is saved to `qa-artifacts/` in your project root:

```
qa-artifacts/
├── .qa-config.json          # Auto-detected project config
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

## Works With Your Existing Setup

- **Respects existing CLAUDE.md** — reads it for context, never overwrites
- **Reads your docs** — TESTING.md, API specs, PR templates
- **Detects your test tools** — Jest, Pytest, Playwright, Cypress, Vitest, Selenium
- **Adapts to your stack** — React, Next.js, Django, FastAPI, .NET, Spring, Go, and more

## License

MIT
