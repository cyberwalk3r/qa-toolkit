---
name: risk-prioritization
description: Prioritize test areas by risk using change frequency, business criticality, and defect density to allocate testing effort effectively.
---

# Risk-Based Test Prioritizer

Prioritize where to focus testing effort by scoring code areas across three risk factors: change frequency (how often code changes), business criticality (how important the functionality is), and defect density (how many bugs have been found). Reads project and session state to ground analysis in actual git history, known risks, coverage gaps, and prior session findings. Produces a ranked test matrix with effort allocation recommendations.

## Input

Accept via `$ARGUMENTS`: repository path or feature area to analyze, optional time window for git analysis (default: 30 days), optional business criticality annotations (e.g., "auth=critical, utils=low").

Derive from input:
- **Analysis scope** -- entire repo, specific modules, or feature area
- **Time window** -- period for git log analysis (default: 30 days)
- **Business criticality overrides** -- user-provided annotations that override inferred criticality

## Workflow

### Step 1: Read State

Read `shared/references/state-integration.md` for the full state reading pattern.

Execute state reading commands:

```bash
PROJECT_STATE=$(node scripts/state-manager.js read project)
SESSION_STATE=$(node scripts/state-manager.js read session)
RISKS=$(node scripts/state-manager.js read project risks)
COVERAGE_GAPS=$(node scripts/state-manager.js read project coverageGaps)
DETECTION=$(node scripts/state-manager.js read project detection)
CONVENTIONS=$(node scripts/state-manager.js read project testingConventions)
SKILL_HISTORY=$(node scripts/state-manager.js read session skillHistory)
FEATURE=$(node scripts/state-manager.js read session featureUnderTest)
FINDINGS=$(node scripts/state-manager.js read session findings)
```

Extract from project state:
- `detection.languages`, `detection.frameworks` -- for business criticality inference based on framework roles
- `risks[]` -- for defect density scoring (each risk entry adds to area's defect score)
- `coverageGaps[]` -- for risk correlation (areas with both high risk and low coverage are priority targets)

Extract from session state:
- `skillHistory[]` -- for prior risk-prioritization runs and coverage-gap findings (cross-skill correlation)
- `findings[]` -- for defect density augmentation (bug-report findings, coverage-gap critical findings)
- `featureUnderTest` -- for scope focus

If no state available (cold start), use defaults per `shared/references/cold-start-pattern.md`. Every conditional below has a fallback.

Load `shared/references/output-formats.md` for multi-platform format support.
Load `shared/references/artifact-organization.md` for context-based save paths.

### Step 2: Parse Input

From `$ARGUMENTS`, determine:
- **Target scope** -- entire repository, specific modules/directories, or a feature area
- **Time window** -- period for git commit frequency analysis (default: 30 days, user can specify e.g., "90 days", "last quarter")
- **Business criticality annotations** -- user-provided overrides (e.g., "auth=10, payments=9, utils=2")

Derive feature name for save path:
1. Explicit scope name from user input (preferred)
2. Session state `featureUnderTest` (if set)
3. "full-repo" if analyzing entire repository (fallback)

Normalize: lowercase, hyphens only.

### Step 3: Check Prior Output

Check session `skillHistory` for prior `risk-prioritization` invocations:

- If prior invocation found for **same scope**: add note at top of output: "Note: Previous risk prioritization for {scope} found from {timestamp}. Showing delta comparison where applicable."
- If no prior invocation: continue without note.

Always generate full output regardless of prior invocations.

### Step 4: Analyze Risk Factors

Read `references/risk-models.md` for the scoring framework, normalization rules, and effort allocation model.

**4a. Change Frequency (Weight: 0.35)**

Guide the user to analyze git commit frequency, or analyze it directly if repo access is available:

```bash
# Example git analysis command for commit frequency by directory
git log --since="{time-window}" --name-only --pretty=format: | sort | uniq -c | sort -rn
```

- Count commits per module/directory within the time window
- Normalize to 0-10 scale using thresholds from risk-models.md
- Apply exponential decay: recent changes weighted more than older changes
- Identify hotspots: modules with disproportionately high commit counts

**4b. Business Criticality (Weight: 0.40)**

Score each area's business importance:
1. Use user-provided annotations if available (highest priority)
2. Infer from file path patterns and framework roles per risk-models.md
3. Cross-reference with `detection.frameworks` for framework-specific criticality signals

Inference rules (from risk-models.md):
- Auth/payment/checkout paths: 9-10
- Data mutation endpoints: 7-8
- Read-only API: 5-6
- Internal tooling: 3-4
- Config/types: 1-2

**4c. Defect Density (Weight: 0.25)**

Score based on known defect signals:
- Each entry in project state `risks[]` matching the area: +2 points
- Each `bug-report` finding in session for the area: +3 points
- Each `coverage-gap` critical finding for the area: +2 points
- Normalize to 0-10 scale

**4d. Composite Risk Score**

Calculate: `Risk Score = (ChangeFreq * 0.35) + (BusinessCriticality * 0.40) + (DefectDensity * 0.25)`

Cross-reference with coverage-gap findings if available in session state:
- Areas with high risk score AND coverage gaps are flagged as "Critical Priority"
- Areas with high risk score but good coverage are flagged as "Maintain Coverage"

### Step 5: Format Output

Read `shared/references/context-preamble.md` and generate the context preamble.

**Context preamble "Why" line:**

When state is available:
```
> **Why this prioritization:** {languages} project analyzed over {time-window} window.
> {N} risk areas from project state inform defect density. {N} coverage gaps correlated with risk scores.
> Prior session findings from {prior skills} incorporated into risk assessment.
```

When cold start:
```
> **Project Context**
> Stack: Not detected | Test Framework: Not detected
>
> **Why this prioritization:** Risk scoring based on user-provided input and file path inference. Run `/qa-setup` or start a new session for git-informed, state-aware analysis.
```

**Risk-Prioritized Test Matrix:**

```markdown
### Risk-Prioritized Test Matrix

| Rank | Area | Risk Score | Change Freq | Business Impact | Defect History | Coverage Status | Recommended Effort |
|------|------|------------|-------------|-----------------|----------------|-----------------|-------------------|
| 1 | {module} | {score}/10 | {score}/10 | {score}/10 | {score}/10 | {Critical Gap/Partial/Good} | {%} of test budget |
| 2 | {module} | {score}/10 | {score}/10 | {score}/10 | {score}/10 | {status} | {%} of test budget |
```

**Effort Allocation Summary:**

```markdown
### Effort Allocation

| Priority Tier | Areas | Combined Risk | Recommended Budget | Focus |
|---------------|-------|---------------|-------------------|-------|
| Tier 1 (Critical) | {areas with score 9-10} | {avg score} | 25-30% | Deep testing: all dimensions, security, performance |
| Tier 2 (High) | {areas with score 7-8} | {avg score} | 15-20% | Comprehensive: unit, integration, key E2E paths |
| Tier 3 (Medium) | {areas with score 5-6} | {avg score} | 10-15% | Standard: unit tests, happy-path integration |
| Tier 4 (Low) | {areas with score 3-4} | {avg score} | 5-10% | Basic: unit tests, smoke tests |
| Tier 5 (Minimal) | {areas with score 1-2} | {avg score} | < 5% | Minimal: type checks, linting |
```

**Risk Factor Breakdown:**

```markdown
### Risk Factor Breakdown

**Change Frequency Hotspots:**
- {area1}: {N} commits in {time-window} (score: {n}/10)
- {area2}: {N} commits in {time-window} (score: {n}/10)

**Business Criticality Map:**
- Critical (9-10): {areas}
- High (7-8): {areas}
- Medium (5-6): {areas}
- Low (1-4): {areas}

**Defect Density Signals:**
- {area}: {N} risk entries + {N} session findings (score: {n}/10)
```

### Step 6: Write Session State

After generating output, write execution summary to session state:

```bash
node scripts/state-manager.js write session skillHistory '{
  "skill": "risk-prioritization",
  "feature": "<scope>",
  "timestamp": "<ISO-8601>",
  "areaCount": <total-areas-analyzed>,
  "topRiskAreas": ["<area1>", "<area2>", "<area3>"],
  "effortAllocation": {"tier1": <n>, "tier2": <n>, "tier3": <n>, "tier4": <n>, "tier5": <n>},
  "riskFactors": {"changeFreq": "<summary>", "businessCriticality": "<summary>", "defectDensity": "<summary>"}
}'

node scripts/state-manager.js merge session findings '{
  "area": "<scope>",
  "type": "risk-prioritization",
  "summary": "Risk prioritization: <N> areas analyzed. Top risks: <areas>. Recommended <X>% budget on tier 1."
}'
```

### Step 7: Save Artifact

Save to `qa-artifacts/risk-analysis/risk-priority-YYYY-MM-DD-<scope>.md`

Apply format from `--format` argument (default: markdown). See `shared/references/output-formats.md`.
Use context-based save path per `shared/references/artifact-organization.md`.

## Output Section Order

1. **Context preamble** -- blockquote with project context and "Why this prioritization" line
2. **Prior output note** -- if applicable (Step 3)
3. **Risk-Prioritized Test Matrix** -- ranked table with composite scores and per-factor breakdown
4. **Effort Allocation Summary** -- tiered budget recommendations
5. **Risk Factor Breakdown** -- detailed per-factor analysis
6. **Cold-start footer** -- if applicable, per `shared/references/cold-start-pattern.md`
7. **Suggested Next Steps**

## Suggested Next Steps

After generating risk prioritization, suggest based on what was produced:
- "Run `/qa-toolkit:test-plan` to incorporate risk priorities into test planning." (always)
- "Risk assessment from this session will inform test plan risk sections automatically." (when findings written to state)
- "Run `/qa-toolkit:regression-planner` to use risk ranking for regression test selection." (conditional: if no regression-planner in session skillHistory)
- "Run `/qa-toolkit:coverage-gap` to identify specific test gaps in high-risk areas." (conditional: if no coverage-gap in session skillHistory)
