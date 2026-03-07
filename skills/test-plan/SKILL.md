---
name: test-plan
description: Generate state-aware test plans from PRD or epic descriptions with scope, approach, environments, risks, and entry/exit criteria.
---

# Test Plan Generator

Generate comprehensive test plans from PRD, epic, or feature requirement input. Reads project and session state to produce plans grounded in the actual tech stack, known risks, coverage gaps, and prior session findings. Output includes all standard test plan sections with traceability back to input requirements.

## Input

Accept via `$ARGUMENTS`: PRD text, epic descriptions, feature requirements, user stories, or Jira epic content.

Derive from input:
- **Epic/PRD name** -- used for save path and traceability
- **Requirements list** -- extracted scope items for traceability matrix
- **Feature scope** -- boundaries of what to test
- **Acceptance criteria** -- inform entry/exit criteria

No format flags needed -- test plans are always structured Markdown.

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
- `detection.languages`, `detection.frameworks`, `detection.testFrameworks` -- for test approach and environment sections
- `detection.packageManager` -- for run commands in resource requirements
- `detection.existingTestDirs` -- for convention alignment in approach
- `risks[]` -- for risk section pre-population
- `coverageGaps[]` -- for scope prioritization
- `testingConventions[]` -- for approach alignment

Extract from session state:
- `featureUnderTest` -- for epic/feature name fallback
- `skillHistory[]` -- for prior output awareness and risk assessment
- `findings[]` -- for cross-referencing prior skill findings into risk section

If no state available (cold start), use defaults per `shared/references/cold-start-pattern.md`. Every conditional below has a fallback.

Load `shared/references/output-formats.md` for multi-platform format support.
Load `shared/references/artifact-organization.md` for context-based save paths.

### Step 2: Parse Input

From `$ARGUMENTS`, extract:
- **Epic/PRD name** -- the primary identifier for this test plan
- **Requirements list** -- individual requirements or user stories
- **Feature scope** -- what functionality is covered
- **Acceptance criteria** -- pass/fail conditions from the input

Derive feature name for save path and traceability:
1. Explicit epic/PRD name from user input (preferred)
2. Session state `featureUnderTest` (if set)
3. Inferred noun phrase from input text (fallback)

Normalize: lowercase, hyphens only (e.g., "User Authentication Epic" -> "user-authentication").

### Step 3: Check Prior Output

Check session `skillHistory` for prior `test-plan` invocations:

- If prior invocation found for **same feature**: add note at top of output: "Note: A test plan for {feature} was already generated this session. Generating fresh plan -- review for overlap with prior version."
- If no prior invocation: continue without note.

Always generate full output regardless of prior invocations.

### Step 4: Generate Test Plan Sections

Read `references/plan-templates.md` for section-by-section templates and interpolation guidance. For each section, use the "With State" template when project state is available, and the "Cold-Start" template when it is not.

Generate all 7 sections:

**4a. Scope**
- Extract testable scope items from each input requirement
- Cross-reference with `coverageGaps[]` to elevate priority of under-tested areas
- Cross-reference with `detection.frameworks` to identify integration boundaries
- Build scope traceability table mapping requirements to scope areas

**4b. Test Approach**
- Map `detection.testFrameworks` to testing types (unit, integration, E2E)
- Map `detection.frameworks` to approach specifics (API testing for server frameworks, component testing for UI frameworks)
- Include testing types based on input signals: performance (if performance requirements mentioned), security (if auth/data handling in scope), accessibility (if UI in scope)
- Align with `testingConventions[]` for test style consistency

**4c. Environments**
- Pre-fill from `detection.languages`, `detection.frameworks`, `detection.packageManager`
- List environments needed: local dev, CI pipeline, staging, production-like
- Include data requirements for each environment

**4d. Schedule/Estimates**
- Apply complexity-based estimation: scope breadth, integration complexity, risk density
- Suggest phased execution: smoke -> functional -> regression -> exploratory -> acceptance
- Adjust effort estimates based on `coverageGaps[]` (more gaps = more effort for gap coverage)
- Express as relative effort percentages, not calendar time

**4e. Risks**
- Merge risks from three sources:
  1. Project state `risks[]` -- pre-populated with occurrence counts
  2. Session `findings[]` -- prior skill findings that indicate risk areas
  3. PRD-derived risks -- extracted from input requirements (new integrations, complex logic, data migration)
- Build risk matrix with likelihood x impact severity calculation
- Categorize: technical, quality, schedule, security

**4f. Entry/Exit Criteria**
- Standard entry criteria (requirements reviewed, environment ready, test data seeded)
- Standard exit criteria (P0/P1 passing, no critical defects)
- Stack-aware additions from `detection.testFrameworks`:
  - If Playwright detected: "All Playwright E2E scenarios pass in CI"
  - If Jest detected: "Jest test suite passes (`npm test`)"
  - If pytest detected: "pytest suite passes (`pytest`)"
- If test-cases skill has run (in skillHistory): "No P0 test cases failing from generated suite"

**4g. Resource Requirements**
- Derive tools from detected stack and test approach
- Derive skills/knowledge from scope areas and frameworks
- Derive data needs from scope and environment requirements

### Step 5: Format Output

Read `shared/references/context-preamble.md` and generate the context preamble.

**Context preamble "Why" line:**

When state is available:
```
> **Why this plan:** {frameworks} detected -- test approach includes {framework}-specific strategies.
> Known risks ({risk areas}) inform risk section. {N} coverage gaps shape scope priorities.
> Prior session findings from {prior skills} incorporated into risk assessment.
```

When cold start:
```
> **Project Context**
> Stack: Not detected | Test Framework: Not detected
>
> **Why this plan:** Standard test plan structure across all sections. Run `/qa-setup` or start a new session for stack-tailored output.
```

**Build traceability matrix** mapping input requirements to test plan sections:

```markdown
### Traceability Matrix

| Requirement | Scope | Approach | Risks | Entry/Exit |
|---|---|---|---|---|
| {REQ-1} | In scope (priority) | {testing type} | {related risk if any} | {specific criterion} |
| {REQ-2} | In scope | {testing type} | -- | Standard criteria |
```

### Step 6: Write Session State

After generating output, write execution summary to session state:

```bash
node scripts/state-manager.js write session skillHistory '{
  "skill": "test-plan",
  "feature": "<epic-or-prd-name>",
  "timestamp": "<ISO-8601>",
  "planSummary": "<1-line summary>",
  "scopeAreas": ["<area1>", "<area2>"],
  "identifiedRisks": ["<risk1>", "<risk2>"],
  "coverageMapping": {"<requirement>": "<test-approach>"},
  "testApproach": "<approach-summary>"
}'

node scripts/state-manager.js merge session findings '{
  "area": "<epic-or-feature>",
  "type": "test-plan",
  "summary": "Test plan generated: <N> scope areas, <N> risks identified, <approach>"
}'
```

## Output Section Order

1. **Context preamble** -- blockquote with project context and "Why this plan" line
2. **Prior output note** -- if applicable (Step 3)
3. **Scope** -- in/out of scope with traceability
4. **Test Approach** -- testing types mapped to scope and stack
5. **Environments** -- pre-filled from detection data
6. **Schedule/Estimates** -- phased execution with relative effort
7. **Risks** -- merged risk matrix with severity calculation
8. **Entry/Exit Criteria** -- stack-aware pass/fail conditions
9. **Resource Requirements** -- tools, environments, skills, data
10. **Traceability Matrix** -- requirements mapped to plan sections
11. **Cold-start footer** -- if applicable, per `shared/references/cold-start-pattern.md`
12. **Suggested Next Steps**

## Save

Save to `qa-artifacts/test-plans/test-plan-YYYY-MM-DD-<feature>.md`

Apply format from `--format` argument (default: markdown). See `shared/references/output-formats.md`.
Use context-based save path per `shared/references/artifact-organization.md`.

## Suggested Next Steps

After generating a test plan, suggest based on what was produced:
- "Generate detailed test cases from scope areas with `/qa-toolkit:test-cases`."
- "Run exploratory testing on high-risk areas with `/qa-toolkit:exploratory-testing`."
- If risks were identified: "Review risk areas with `/qa-toolkit:risk-prioritization` for deeper analysis."
- If E2E approach included: "Scaffold E2E tests with `/qa-toolkit:e2e-test`."
