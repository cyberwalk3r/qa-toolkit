---
name: setup
description: Read auto-detected project config and existing docs, confirm detection results with the user, and save corrections.
---

# QA Toolkit Setup

Read `qa-artifacts/.qa-config.json` for auto-detected project context.

## Workflow

1. **Show the user what was detected** — languages, frameworks, test tools, CI/CD, package manager
2. **Read existing docs** if found:
   - `CLAUDE.md` — project conventions, existing guidelines
   - `README.md` — project overview
   - `TESTING.md` — testing standards (if exists)
   - `CONTRIBUTING.md` — contribution workflow (if exists)
3. **Ask the user** to confirm or correct:
   - Is the detected tech stack correct?
   - What bug tracker does the team use? (Jira / GitHub Issues / Azure DevOps / Linear)
   - Any high-risk areas of the app the team should focus on?
4. **Update `qa-artifacts/.qa-config.json`** with corrections and preferences
5. **Suggest adding output directory to `.gitignore`** if not already present:
   - Check if `qa-artifacts/` (or the configured `outputDir`) is in the project's `.gitignore`
   - If not, suggest adding it — QA artifacts contain machine-specific paths and session-specific output that shouldn't be committed
   - Example line to add: `qa-artifacts/`
6. **Summarize** what's configured and which skills are most relevant for this project

## Important
- **Read only** — do not create or modify CLAUDE.md, README, or any existing project files
- This is a configuration step, not a documentation generator

## Suggested Next Steps
After setup is complete, suggest:
- "Start with a PR review (`/qa-toolkit:pr-review`) or generate test cases from your requirements (`/qa-toolkit:test-cases`)."
