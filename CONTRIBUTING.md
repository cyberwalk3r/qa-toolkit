# Contributing

## How to Contribute

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes
4. Test locally: `claude --plugin-dir ./qa-toolkit`
5. Submit a pull request

## Adding a New Skill

1. Create `skills/<skill-name>/SKILL.md` with YAML frontmatter (`name`, `description`)
2. Add reference files in `skills/<skill-name>/references/` if needed
3. Update README.md with the new skill
4. Update CHANGELOG.md

## Adding a New Agent

1. Create `agents/<agent-name>.md` with YAML frontmatter (`name`, `description`)
2. Define the persona, not the workflow — workflows belong in skills
3. Update README.md

## Guidelines

- Keep SKILL.md `description` fields to one sentence
- Reference files should contain non-obvious, specific guidance — not generic info Claude already knows
- All generated artifacts should be saved to `qa-artifacts/<category>/`
- Test with `claude --debug --plugin-dir ./qa-toolkit` to verify component loading
