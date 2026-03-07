---
name: release-readiness
description: Go/no-go release assessment with interactive quality gate scoring, risk matrix, and monitoring plan. Use whenever a team is deciding whether to release, asks "are we ready to ship?", or needs a formal sign-off document before any release from hotfix to major version.
---

# Release Readiness Assessment

Generate a go/no-go release decision through an interactive quality gate assessment. Reads project and session state to pre-populate quality signals from prior skill findings (regression plan, PR reviews, bug reports) — reducing questions asked. Produces a scored verdict with conditions, risk matrix, monitoring plan, and rollback criteria.

## Input
Accept via `$ARGUMENTS`: release type (hotfix/patch/minor/major), version number, or start without arguments.

## Workflow

### Step 1: Read State

```bash
PROJECT_STATE=$(node scripts/state-manager.js read project)
SESSION_STATE=$(node scripts/state-manager.js read session)
DETECTION=$(node scripts/state-manager.js read project detection)
RISKS=$(node scripts/state-manager.js read project risks)
SKILL_HISTORY=$(node scripts/state-manager.js read session skillHistory)
FINDINGS=$(node scripts/state-manager.js read session findings)
```

Extract from project state:
- `risks[]` — pre-populate risk matrix entries
- `detection.testFrameworks` — for deployment readiness checks

Extract from session state:
- `skillHistory[]` — check for `regression-planner`, `pr-review`, `bug-report` entries to pre-fill quality signals
- `findings[]` — risk or bug findings inform quality gate scoring

### Step 2: Identify Release Type

From `$ARGUMENTS` or by asking the user:
- **Hotfix** — emergency fix, minimal testing required
- **Patch** — bug fixes, targeted testing
- **Minor** — new features, standard testing
- **Major** — breaking changes, full regression

Read `references/release-types.md` for type-specific quality gate thresholds.

### Step 3: Pre-fill Quality Signals from Session

Before asking questions, extract available signals:
- **If `regression-planner` in skillHistory**: use its `recommendedScope` and `p0Areas` to pre-answer the regression testing question
- **If `pr-review` in skillHistory**: use its `riskLevel` and `regressionSurface` for test coverage and risk context
- **If `bug-report` in skillHistory**: use `severity` entries to pre-populate known open bugs
- **If `risks[]` in project state**: surface in risk matrix as pre-populated entries

For each pre-filled signal, state it explicitly and ask the user to confirm or correct rather than asking from scratch.

### Step 4: Gather Remaining Quality Signals

For signals not available from session state, ask the user:
- Test execution status — how many tests passed/failed/blocked?
- Known open bugs — any blockers or criticals not yet in session?
- New features tested against acceptance criteria?
- Performance — any degradation noted?
- Security — any new vulnerabilities?

### Step 5: Score Quality Gates (0–100)

| Gate | What it measures |
|------|-----------------|
| Test Coverage | % of P0 tests passing, coverage of changed areas |
| Bug Status | Open blocker/critical bugs (blocker = 0 score, each critical = -10) |
| Regression | Regression scope completed vs recommended scope |
| Deployment Readiness | Env configs, feature flags, rollback plan in place |

For thresholds per release type, read `references/release-types.md`.

### Step 6: Generate Verdict

- **GO**: All gates ≥ 70, no open blockers
- **CONDITIONAL GO**: One or more gates 50–69, or open criticals with mitigation plan
- **NO-GO**: Any gate < 50, or any open blocker

### Step 7: Format with Context Preamble

```markdown
> **Project Context**
> Stack: {languages} | Frameworks: {frameworks}
> Prior session: {N findings from regression-planner/pr-review/bug-report used to pre-fill}
>
> **Why this assessment:** {N} prior skill findings used to pre-populate quality signals.
```

Cold start: "No prior session context — all quality signals gathered interactively."

### Step 8: Write Session State

```bash
node scripts/state-manager.js write session skillHistory '{
  "skill": "release-readiness",
  "feature": "<version>",
  "timestamp": "<ISO-8601>",
  "releaseType": "<hotfix|patch|minor|major>",
  "verdict": "<GO|CONDITIONAL_GO|NO_GO>",
  "gateScores": {"coverage": <n>, "bugStatus": <n>, "regression": <n>, "deployment": <n>},
  "openBlockers": <n>,
  "conditions": ["<condition1>"]
}'

node scripts/state-manager.js merge session findings '{
  "area": "<version>",
  "type": "release-readiness",
  "summary": "Release assessment: <verdict>. Gates: Coverage <n>, Bugs <n>, Regression <n>, Deployment <n>. Blockers: <n>."
}'
```

## Output Structure

```
## Release Readiness Assessment
Version: <version>
Release Type: <type>
Date: YYYY-MM-DD

### Overall Verdict: GO / NO-GO / CONDITIONAL GO
Confidence: <percentage>

### Quality Gate Scores
| Gate | Score | Status | Details |
|------|-------|--------|---------|
| Test Coverage | xx/100 | ✅/⚠️/❌ | ... |
| Bug Status | xx/100 | ✅/⚠️/❌ | ... |
| Regression | xx/100 | ✅/⚠️/❌ | ... |
| Deployment | xx/100 | ✅/⚠️/❌ | ... |

### Risk Matrix
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|

### Conditions (if Conditional Go)
- [ ] <condition that must be met>

### Post-Release Monitoring Plan
- First 1 hour: <what to monitor>
- First 24 hours: <what to monitor>
- First 72 hours: <what to monitor>

### Rollback Trigger Criteria
- <condition that triggers rollback>
```

## Output Section Order

1. **Context preamble** — blockquote with project context and pre-filled signals note
2. **Overall Verdict** — GO/CONDITIONAL GO/NO-GO with confidence score
3. **Quality Gate Scores** — table with per-gate scores and status icons
4. **Risk Matrix** — pre-populated from session state risks + new findings
5. **Conditions** — if Conditional Go, actionable list
6. **Post-Release Monitoring Plan**
7. **Rollback Trigger Criteria**
8. **Suggested Next Steps**

## Save
Save to `qa-artifacts/release-assessments/release-YYYY-MM-DD-<version>.md`

## Suggested Next Steps
After the assessment:
- If verdict is **NO-GO** or Regression Score < 70: "Plan targeted regression testing with `/qa-toolkit:regression-planner`."
- If Bug Status Score < 70: "File and triage remaining bugs with `/qa-toolkit:bug-report`."
- If verdict is **GO** or **CONDITIONAL GO**: "Run a final risk prioritization with `/qa-toolkit:risk-prioritization` to confirm no missed areas."
