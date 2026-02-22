---
name: regression-planner
description: Analyze change impact and create risk-based regression test plans with time estimates
---

# Regression Test Planner

Analyze changes and plan targeted regression testing. Read `qa-artifacts/.qa-config.json` for project context.

## Input
Accept via `$ARGUMENTS`: PR details, release description, list of changed files, or feature area.

## Workflow

1. **Map the change scope** — what files/modules changed
2. **Identify impact radius**:
   - Direct: features that use the changed code
   - Indirect: features that depend on those features
   - Shared: utilities, configurations, middleware used across features
3. **Risk-rank each affected area** (High / Medium / Low)
4. **Generate regression test plan** with time estimates
5. **Recommend scope** based on available time:
   - **Quick (1-2h)** — smoke tests on changed + directly affected areas
   - **Standard (4-8h)** — above + integration points and shared components
   - **Full (1-2 days)** — complete regression suite

## Output Structure

```
## Regression Plan: <change description>
Date: YYYY-MM-DD

### Change Summary
<what changed and why>

### Impact Analysis
| Area | Impact | Risk | Reason |
|------|--------|------|--------|
| ... | Direct/Indirect/Shared | High/Med/Low | ... |

### Recommended Test Scope
#### Must Test (P0) — <time estimate>
- [ ] <test area and what to verify>

#### Should Test (P1) — <time estimate>
- [ ] <test area>

#### Nice to Test (P2) — <time estimate>
- [ ] <test area>

### Skip Justification
<areas consciously not tested and why>
```

For detailed impact analysis heuristics, read `references/impact-analysis.md`.

## Save
Save to `qa-artifacts/regression-plans/regression-YYYY-MM-DD-<brief>.md`
