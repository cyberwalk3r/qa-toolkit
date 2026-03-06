---
name: setup
description: Read auto-detected project config and existing docs, confirm detection results with the user, and save corrections and preferences. Use this skill when starting a new project with QA Toolkit, after installation, or when a user asks to check what was detected, configure QA settings, or update tracker or risk preferences.
---

# QA Toolkit Setup

Show the user what QA Toolkit detected about their project, read relevant existing docs for context, and save any corrections to project state.

## Workflow

1. **Read project state:**
   ```bash
   node scripts/state-manager.js read project detection
   ```
   Show the user what was detected: languages, frameworks, test tools, CI/CD, package manager, monorepo, test directories.

2. **Read existing docs** if found (from detection):
   - `CLAUDE.md` — project conventions, existing guidelines
   - `README.md` — project overview
   - `TESTING.md` — testing standards (if exists)
   - `CONTRIBUTING.md` — contribution workflow (if exists)

3. **Ask the user** to confirm or correct:
   - Is the detected tech stack correct?
   - What bug tracker does the team use? (Jira / GitHub Issues / Azure DevOps / Linear)
   - Any high-risk areas of the app the team should focus testing on?

4. **Save corrections and preferences** using state-manager:
   ```bash
   node scripts/state-manager.js write project <key> <json-value>
   ```
   Save user-confirmed values (tracker preference, risk areas, corrections to detection).

5. **Suggest adding output directory to `.gitignore`** if not already present:
   - `qa-artifacts/` contains machine-specific paths and session-specific output that shouldn't be committed
   - If not already in `.gitignore`, suggest adding: `qa-artifacts/`

6. **Summarize** what's configured and which skills are most relevant for this project's stack.

## Important
- **Read only** — do not create or modify `CLAUDE.md`, `README.md`, or any existing project files
- This is a configuration step, not a documentation generator

## Suggested Next Steps
After setup is complete, suggest based on the user's stated goals:
- "Start with a PR review (`/qa-toolkit:pr-review`) or generate test cases from your requirements (`/qa-toolkit:test-cases`)."
