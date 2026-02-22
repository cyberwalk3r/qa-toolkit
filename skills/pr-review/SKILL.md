---
name: pr-review
description: Analyze PR changes and generate QA-focused review with risk flags and testing checklist
---

# PR Review Assistant

Generate a QA-focused review of a pull request. Read `qa-artifacts/.qa-config.json` for project context.

## Input
Accept any of: PR URL, branch name, diff output, file list, or description of changes. Use `$ARGUMENTS` for the PR identifier.

## Workflow

1. **Analyze the changes** — read the diff, modified files, and commit messages
2. **Classify the change type**: feature, bugfix, refactor, dependency update, config change, migration
3. **Load risk patterns** from `references/risk-patterns.md` based on detected tech stack
4. **Generate the review**

## Output Structure

### What Changed
1-3 sentence plain-English summary of what this PR does from a user's perspective.

### Change Classification
- **Type**: Feature / Bugfix / Refactor / Config / Migration / Dependency
- **Scope**: Which areas of the application are affected
- **Risk Level**: Low / Medium / High / Critical

### Risk Flags
Flag any of these if detected:
- 🔴 Database/migration changes
- 🔴 Authentication or authorization changes
- 🔴 Payment or financial logic
- 🟡 API contract changes (request/response shape)
- 🟡 Missing or reduced test coverage
- 🟡 Hardcoded values (URLs, credentials, config)
- 🟡 Large file changes (>300 lines in a single file)
- 🟢 Error handling added/modified
- 🟢 New dependencies added

### QA Checklist
Generate numbered, actionable items specific to THIS PR's changes. Not generic — every item should reference specific functionality from the diff.

### Regression Areas
What existing functionality could break because of these changes?

### Recommendation
- **Approve** — changes look safe, standard testing sufficient
- **Needs Testing** — specific areas need manual verification before merge
- **Request Changes** — issues found that should be addressed

## Save
Save to `qa-artifacts/pr-reviews/pr-review-YYYY-MM-DD-<brief>.md`

## Adapting
For detailed risk patterns by tech stack, read `references/risk-patterns.md`.
For detailed review criteria by change type, read `references/review-criteria.md`.
