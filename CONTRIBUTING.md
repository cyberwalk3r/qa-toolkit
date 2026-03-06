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

---

Something missing or wrong? Open an issue — this doc is meant to stay short, not stay incomplete.
