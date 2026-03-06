---
name: coverage-gap
description: Analyze test coverage against requirements and code paths to identify untested areas with severity classification.
---

# Coverage Gap Analyzer

Identify gaps in test coverage by comparing test files against source modules, tracing requirements to tests, and detecting missing test types. Reads project and session state to ground analysis in the actual tech stack, known risks, and prior findings. Classifies each gap by severity and recommends specific test types to close coverage holes.

## Input

Accept via `$ARGUMENTS`: source directories, requirement documents, test directories, feature descriptions, or module names to analyze.

Derive from input:
- **Scope boundaries** -- which modules, features, or requirements to analyze
- **Comparison targets** -- source-to-test mapping, requirement-to-test tracing, or both
- **Analysis mode** -- file-level mapping, requirement tracing, or comprehensive (both)

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
- `detection.languages`, `detection.testFrameworks`, `detection.existingTestDirs` -- for test file naming conventions and directory structure comparison
- `risks[]` -- for severity escalation of gaps in risk areas
- `coverageGaps[]` -- for cross-referencing with newly detected gaps
- `testingConventions[]` -- for understanding expected test patterns

Extract from session state:
- `skillHistory[]` -- for prior coverage-gap runs (delta comparison)
- `featureUnderTest` -- for scope focus
- `findings[]` -- for cross-referencing prior skill output

If no state available (cold start), use defaults per `shared/references/cold-start-pattern.md`. Every conditional below has a fallback.

Load `shared/references/output-formats.md` for multi-platform format support.
Load `shared/references/artifact-organization.md` for context-based save paths.

### Step 2: Parse Input

From `$ARGUMENTS`, determine:
- **Scope** -- specific modules, features, or requirements to analyze (or "all" for full repo scan)
- **Comparison mode** -- test-file-to-source mapping (file-level), requirement tracing (requirement-level), or both (comprehensive)

Derive feature name for save path:
1. Explicit scope name from user input (preferred)
2. Session state `featureUnderTest` (if set)
3. Inferred module/directory name from input (fallback)

Normalize: lowercase, hyphens only (e.g., "Auth Module" -> "auth-module").

### Step 3: Check Prior Output

Check session `skillHistory` for prior `coverage-gap` invocations:

- If prior invocation found for **same scope**: add note at top of output: "Note: Previous coverage gap analysis for {scope} found from {timestamp}. Highlighting changes since last analysis."
- If no prior invocation: continue without note.

Always generate full output regardless of prior invocations.

### Step 4: Analyze Coverage Gaps

Read `references/coverage-patterns.md` for gap categories, detection heuristics, and severity classification.

**4a. File-Level Gap Detection**
- Compare test file tree against source file tree using naming convention matching
- For each source module without a corresponding test file, record as gap
- Check import analysis: test files that import from a module indicate some coverage
- Apply stack-aware patterns from coverage-patterns.md for framework-specific gaps

**4b. Test Type Gap Detection**
- For each covered module, check which test types exist (unit, integration, E2E, security, performance)
- Flag modules with only one test type when multiple are warranted (e.g., auth code with only unit tests but no integration or security tests)
- Cross-reference with `detection.testFrameworks` for available test infrastructure

**4c. Requirement Tracing Gaps**
- If requirements provided, trace each requirement to test files or test cases
- Requirements with no traceable tests are Critical gaps
- Requirements with partial coverage (some paths tested, others not) are High gaps

**4d. Severity Classification**
- Apply severity rules from coverage-patterns.md
- Cross-reference each gap with project state `risks[]` -- bump severity +1 if area appears in risks
- Cross-reference with `coverageGaps[]` for pre-existing known gaps -- bump severity +1 if already flagged
- Add "State Signal" annotation showing why severity was escalated (or "None" if base severity)

### Step 5: Format Output

Read `shared/references/context-preamble.md` and generate the context preamble.

**Context preamble "Why" line:**

When state is available:
```
> **Why this analysis:** {languages} project with {testFrameworks} detected -- gap detection uses {framework}-specific naming conventions.
> Known risks ({risk areas}) escalate gap severity. {N} pre-existing coverage gaps cross-referenced.
> Prior session findings from {prior skills} incorporated into gap assessment.
```

When cold start:
```
> **Project Context**
> Stack: Not detected | Test Framework: Not detected
>
> **Why this analysis:** Standard file-level and requirement-level gap detection. Run `/qa-setup` or start a new session for stack-tailored analysis.
```

**Coverage Gap Analysis table:**

```markdown
### Coverage Gap Analysis

| # | Area | Gap Description | Severity | Test Type Needed | State Signal |
|---|------|-----------------|----------|------------------|--------------|
| 1 | {module/feature} | {what is missing} | Critical | {unit/integration/E2E/security} | {risk area match / coverage gap match / None} |
| 2 | {module/feature} | {what is missing} | High | {test type} | {signal or None} |
```

**Gap Summary Statistics:**

```markdown
### Gap Summary

**Total Gaps:** {N} | Critical: {n} | High: {n} | Medium: {n} | Low: {n}

**By Gap Type:**
| Gap Type | Count | Top Areas |
|----------|-------|-----------|
| Untested modules | {n} | {area1}, {area2} |
| Missing test types | {n} | {area1}, {area2} |
| Untested requirements | {n} | {area1}, {area2} |
| Missing dimensions | {n} | {area1}, {area2} |
```

**Recommendations section:**
- Prioritized list of gaps to address first (Critical, then High)
- Suggested test frameworks/tools for each gap type
- Estimated effort (relative: small/medium/large) per gap area

### Step 6: Write Session State

After generating output, write execution summary to session state:

```bash
node scripts/state-manager.js write session skillHistory '{
  "skill": "coverage-gap",
  "feature": "<scope>",
  "timestamp": "<ISO-8601>",
  "gapCount": <total-gaps>,
  "bySeverity": {"critical": <n>, "high": <n>, "medium": <n>, "low": <n>},
  "gapAreas": ["<area1>", "<area2>"],
  "recommendedTestTypes": ["<type1>", "<type2>"]
}'

node scripts/state-manager.js merge session findings '{
  "area": "<scope>",
  "type": "coverage-gap",
  "summary": "Coverage gap analysis: <N> gaps found (<critical> critical, <high> high). Top areas: <areas>"
}'
```

### Step 7: Save Artifact

Save to `qa-artifacts/coverage-analysis/coverage-gap-YYYY-MM-DD-<scope>.md`

Apply format from `--format` argument (default: markdown). See `shared/references/output-formats.md`.
Use context-based save path per `shared/references/artifact-organization.md`.

## Output Section Order

1. **Context preamble** -- blockquote with project context and "Why this analysis" line
2. **Prior output note** -- if applicable (Step 3)
3. **Coverage Gap Analysis** -- structured table with severity and state signals
4. **Gap Summary Statistics** -- totals by severity and gap type
5. **Recommendations** -- prioritized actions with effort estimates
6. **Cold-start footer** -- if applicable, per `shared/references/cold-start-pattern.md`
7. **Suggested Next Steps**

## Suggested Next Steps

After generating coverage gap analysis, suggest based on what was produced:
- "Run `/qa-toolkit:test-cases` to generate tests for identified gaps." (always)
- "Coverage gaps from this session will inform test case prioritization automatically." (when findings written to state)
- "Run `/qa-toolkit:test-plan` to incorporate gap analysis into test planning." (conditional: if no test-plan in session skillHistory)
- "Run `/qa-toolkit:risk-prioritization` to correlate gaps with risk-ranked areas." (conditional: if no risk-prioritization in session skillHistory)
