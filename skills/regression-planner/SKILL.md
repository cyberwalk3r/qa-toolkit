---
name: regression-planner
description: Plan targeted regression testing by mapping impact radius, ranking risk, and recommending scope (Quick/Standard/Full). Use this skill when a user asks "what should we retest?", has just made changes and needs to know what's at risk, or is preparing for a release and needs to scope regression effort from a PR, file list, or feature description.
---

# Regression Test Planner

Analyze changes and plan targeted regression testing. Reads project and session state to rank risks using known risk areas, coverage gaps, and prior skill findings. Consumes pr-review and bug-report session data for cross-skill impact analysis.

## Input

Accept via `$ARGUMENTS`: PR details, release description, list of changed files, or feature area.

Optional flags in `$ARGUMENTS`:
- `--scope quick|standard|full` -- override scope recommendation

## Workflow

### Step 1: Read State

Read `shared/references/state-integration.md` for the full state reading pattern.

Execute state reading commands:

```bash
PROJECT_STATE=$(node scripts/state-manager.js read project)
SESSION_STATE=$(node scripts/state-manager.js read session)
DETECTION=$(node scripts/state-manager.js read project detection)
RISKS=$(node scripts/state-manager.js read project risks)
COVERAGE_GAPS=$(node scripts/state-manager.js read project coverageGaps)
SKILL_HISTORY=$(node scripts/state-manager.js read session skillHistory)
FINDINGS=$(node scripts/state-manager.js read session findings)
FEATURE=$(node scripts/state-manager.js read session featureUnderTest)
```

Extract from project state:
- `detection.languages`, `detection.frameworks`, `detection.monorepo` -- for dependency awareness and monorepo cross-package impact
- `risks[]` -- for historical risk boosting
- `coverageGaps[]` -- for high-priority regression areas

Extract from session state:
- `skillHistory[]` -- for prior pr-review and bug-report findings
- `findings[]` -- for accumulated session context
- `featureUnderTest` -- for scope focus

If no state available (cold start), use defaults per `shared/references/cold-start-pattern.md`. Every conditional below has a fallback.

### Step 1b: Check Session Findings

Explicitly check session for prior pr-review or bug-report entries. This is the key cross-skill consumption point. Full heuristics in `references/impact-analysis.md` "State-Driven Prioritization" section.

**If pr-review found in skillHistory:**
- Seed impact analysis with its `affectedAreas` as starting points (instead of only file-based mapping)
- Use its `riskFlags` to boost risk of matching areas
- If its `riskLevel` is "high" or "critical", set minimum recommended scope to "standard" (skip "quick")

**If bug-report found in skillHistory:**
- Boost risk for its `component` area by one tier

**If neither found:**
- Proceed with file-based impact analysis only (no degradation in output quality)

### Step 2: Map Change Scope

Identify what files and modules changed:
- Parse PR diff, file list, or feature area description from `$ARGUMENTS`
- Group changes by module/package boundary
- If `detection.monorepo` is present, identify which packages are affected

### Step 3: Check Prior Output

Check session `skillHistory` for prior `regression-planner` invocations:

- If prior found for similar scope: add note at top of output: "Note: A regression plan for a similar scope was generated earlier this session. Generating fresh plan -- review for overlap."

Always generate full output regardless of prior invocations.

### Step 4: Identify Impact Radius

Read `references/impact-analysis.md` for full heuristics. Apply file-based impact mapping, then enhance with state:

1. **Direct:** Features that use the changed code + pr-review `affectedAreas` (if available from Step 1b)
2. **Indirect:** Features that depend on those features + pr-review `regressionSurface` (if available)
3. **Shared:** Utilities, configurations, middleware used across features
4. **Monorepo:** If `detection.monorepo`, check cross-package impact (2x risk multiplier per `references/impact-analysis.md`)

### Step 5: Risk-Rank

Apply existing risk multipliers from `references/impact-analysis.md`. Then apply state-driven prioritization:

- **Known risk areas** from project state `risks[]` -> boost one tier (Low -> Medium, Medium -> High)
- **Coverage gaps** from project state `coverageGaps[]` -> flag and boost one tier
- **Prior pr-review riskFlags** -> boost matching areas
- **Prior bug-report component** -> boost one tier

### Step 6: Generate Regression Plan

Recommend scope based on risk levels:
- **Quick (1-2h)** -- smoke tests on changed + directly affected areas
- **Standard (4-8h)** -- above + integration points and shared components
- **Full (1-2 days)** -- complete regression suite

If pr-review `riskLevel` was "high" or "critical" (from Step 1b), minimum scope is "standard".

Output includes enhanced Impact Analysis table with a **"State Signal"** column showing what project knowledge influenced each row:
- "Known risk area" -- matched a `risks[]` entry
- "Coverage gap" -- matched a `coverageGaps[]` entry
- "PR review finding" -- seeded from pr-review `affectedAreas` or boosted by `riskFlags`
- "Bug report finding" -- boosted from prior bug-report component
- "--" -- no state signal (file-based analysis only)

### Step 7: Format with Context Preamble

Read `shared/references/context-preamble.md` and generate the context preamble. The "Why" line for regression-planner:

```
> **Why this plan:** Impact analysis informed by {N} known risk areas and {N} coverage gaps.
> Monorepo context: {monorepo.type} ({N} packages) -- cross-package impact checked.
> Prior session: {N} findings from {skills} inform risk ranking.
```

Omit the monorepo line if `detection.monorepo` is null. Omit the prior session line if no prior skill findings consumed.

### Step 8: Write Session State

After generating output, write execution summary to session state:

```bash
node scripts/state-manager.js write session skillHistory '{
  "skill": "regression-planner",
  "feature": "<change-description>",
  "timestamp": "<ISO-8601>",
  "impactAreas": [
    {"area": "<area>", "impact": "direct|indirect|shared", "risk": "high|medium|low"}
  ],
  "recommendedScope": "quick|standard|full",
  "p0Areas": ["<must-test-area1>", "<must-test-area2>"]
}'

node scripts/state-manager.js merge session findings '{
  "area": "<change-scope>",
  "type": "regression-planner",
  "summary": "Impact: <N> areas affected (<direct> direct, <indirect> indirect). Recommended: <scope> scope. P0: <areas>"
}'
```

## Output Structure

```
## Regression Plan: <change description>
Date: YYYY-MM-DD

### Change Summary
<what changed and why>

### Impact Analysis
| Area | Impact | Risk | Reason | State Signal |
|------|--------|------|--------|--------------|
| Auth module | Direct | High | Core auth flow changed | Known risk area |
| User dashboard | Indirect | Medium | Depends on auth | Coverage gap |
| Payment flow | Indirect | High | Uses shared middleware | PR review finding |
| Settings page | Shared | Low | Config change | -- |

### Recommended Test Scope
#### Must Test (P0) -- <time estimate>
- [ ] <test area and what to verify>

#### Should Test (P1) -- <time estimate>
- [ ] <test area>

#### Nice to Test (P2) -- <time estimate>
- [ ] <test area>

### Skip Justification
<areas consciously not tested and why>
```

## Output Section Order

1. **Context preamble** -- blockquote with project context, "Why this plan", per `shared/references/context-preamble.md`
2. **Prior output note** -- if applicable (Step 3). If pr-review/bug-report data was consumed: "Note: A pr-review for this area was generated earlier this session (risk level: {level}, {N} checklist items). Generating regression plan using those findings as input."
3. **Change Summary**
4. **Impact Analysis** -- with State Signal column
5. **Recommended Test Scope** -- P0/P1/P2 with time estimates (Quick/Standard/Full)
6. **Skip Justification**
7. **Cold-start footer** -- if applicable, per `shared/references/cold-start-pattern.md`
8. **Suggested Next Steps**

## Save

Save to `qa-artifacts/regression-plans/regression-YYYY-MM-DD-<brief>.md`

## Suggested Next Steps

After generating the regression plan, suggest based on context:
- "When regression testing is complete, assess release readiness with `/qa-toolkit:release-readiness`."
- "Generate test cases for the P0 areas with `/qa-toolkit:test-cases`." If findings were written: "(Impact areas and P0 list will inform test case prioritization.)"
- "Automate P0 regression checks as Playwright E2E tests with `/qa-toolkit:e2e-test`." If p0Areas were written: "(P0 areas from this plan will be used to focus E2E scaffold.)"
