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
