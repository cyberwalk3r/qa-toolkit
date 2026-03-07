# Design: Docs Rewrite + GitHub Pages

**Date:** 2026-03-06
**Status:** Approved

## Problem

QA Toolkit v2.0 shipped 9 phases of work — 5 new skills, redesigned agents, a state-aware system, shared references, and multi-format output — but the docs still reflect v1.1.0. The README lists 10 commands (v2 has 15). The CHANGELOG has no v2.0 entry. CONTRIBUTING.md doesn't mention any v2 conventions. There is no public-facing site.

## Goal

1. Rewrite README, CHANGELOG, and CONTRIBUTING with a new narrative that appeals to both QA professionals and developers.
2. Launch a GitHub Pages site (`docs/index.html`) that serves as a captivating landing page and full reference — no build step required.

## Approach: README-First (Single Source of Truth)

Fix the README as the authoritative source. The GitHub Pages site renders that content with a dramatically improved visual design. Update one, the other stays current in spirit.

---

## Doc Fixes

### README.md — Full Rewrite

**Narrative shift:** From "a plugin that produces QA artifacts" to "QA that thinks for itself."

**Structure:**
```
[centered header + one-liner + badges]
[quick install one-liner]
[2–3 punchy social-proof quotes]
[Why I Built This — short, honest, personal]
[How It Works — 3-step flow with terminal example]
[Commands — grouped by phase: Authoring / Review / Release / Analysis]
[Agents — "when you need a conversation, not a document"]
[What's New in v2.0 — state-awareness, 15 skills, redesigned agents]
[Output — artifact directory tree]
[Permissions & Side Effects]
[Install options]
[License]
```

**Tone:** Direct, slightly irreverent, anti-enterprise. Speaks to both the developer who also does QA and the dedicated QA lead.

**Key additions vs current:**
- All 15 skills (current README lists 10 — missing test-plan, exploratory-testing, coverage-gap, risk-prioritization, flaky-test-diagnosis)
- Commands grouped by workflow phase instead of flat table
- v2.0 state-aware system explained in plain language
- Badges: install, GitHub stars, license, CI status
- Personal founder voice in "Why I Built This"

### CHANGELOG.md — Add v2.0 Entry

Written as a narrative summary (not just bullets) that tells the story of what changed and why. Covers:
- State-aware skill system
- 5 new skills (test-plan, exploratory-testing, coverage-gap, risk-prioritization, flaky-test-diagnosis)
- 3 redesigned skills (e2e-test, bug-report, api-test, regression-planner, pr-review)
- Redesigned agents (tool restrictions, return contracts, persistent memory)
- Shared references system (`skills/shared/references/`)
- Multi-format output
- Test suite updates

### CONTRIBUTING.md — Rewrite

Friendlier tone, structured as "here's how it all fits together." Adds:
- State-aware skill pattern: read `.qa-config.json` → adapt output → write findings
- Shared references in `skills/shared/references/` and when to use them
- v2 agent conventions: tool restrictions, return contracts, persistent memory
- Updated skill creation steps reflecting v2 conventions

---

## GitHub Pages Site

### Tech Stack

Pure HTML/CSS/JS in `docs/` folder. GitHub Pages serves from `docs/` on `main` branch — no build step, no CI, no config files needed.

### Visual Direction

- Dark background (`#0d0d0d`), monospace font for terminal aesthetic
- Accent color: electric amber (`#f59e0b`) — warm, readable, distinct from GSD green
- Hero: full-viewport, animated CSS typewriter showing a `/qa-toolkit:bug-report` invocation and artifact output
- Command grid: card-based layout grouped by workflow phase, hover reveals description
- Smooth scroll, anchor navigation at top

### Page Sections

```
[Hero — headline + install one-liner + terminal animation]
[Social proof strip — 2–3 quotes]
[How It Works — 3-step visual flow]
[Commands — card grid, grouped by phase]
[Agents — 3 cards with persona descriptions]
[v2.0 callout strip — "What's new"]
[Install — code block + link to GitHub]
[Footer — license, GitHub link]
```

### File Layout

```
docs/
├── index.html      # Single page, all content inline
├── style.css       # Extracted styles
└── assets/
    └── terminal.svg  # Optional animated terminal demo
```

### GitHub Pages Activation

Enable via: repo Settings → Pages → Source: `docs/` folder on `main` branch.
No `_config.yml` needed for plain HTML.

---

## Implementation Phases

1. **CHANGELOG.md** — add v2.0 entry (lowest risk, no structural changes)
2. **CONTRIBUTING.md** — rewrite with v2 conventions
3. **README.md** — full rewrite with new narrative and all 15 skills
4. **docs/index.html + style.css** — build GitHub Pages site
5. **GitHub Pages** — enable in repo settings, verify deploy

## Success Criteria

- All 15 skills documented in README
- CHANGELOG has a v2.0 entry
- CONTRIBUTING reflects v2 conventions
- GitHub Pages site live and visually compelling
- No broken links or missing content
