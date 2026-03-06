---
name: pr-review
description: Analyze PR changes with risk assessment, change-impact analysis, and a diff-specific QA checklist grounded in project context. Use this skill whenever a user shares a PR link, branch name, diff, or list of changed files and wants to know what to test — even a casual description like "I just changed the auth module" is enough to start a review.
---

# PR Review Assistant

Generate a QA-focused review of a pull request. Reads project and session state to produce context-aware output with dynamic risk assessment, change-impact analysis mapping files to user flows, and a diff-specific QA checklist.

## Input

Accept via `$ARGUMENTS`: PR URL, branch name, diff output, file list, or description of changes.

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
```

Extract from project state:
- `detection.languages`, `detection.frameworks` -- for stack-specific risk pattern loading
- `detection.monorepo` -- for cross-package change detection
- `risks[]` -- for dynamic risk enhancement (cross-reference with diff)
- `coverageGaps[]` -- for extra scrutiny areas

Extract from session state:
- `featureUnderTest` -- for scope context
- `skillHistory[]` -- for prior output awareness (Step 3)
- `findings[]` -- for cross-reference with prior skill output

If no state available (cold start), use defaults per `shared/references/cold-start-pattern.md`. Every conditional below has a fallback.

Load `shared/references/output-formats.md` for multi-platform format support.
Load `shared/references/artifact-organization.md` for context-based save paths.

### Step 2: Analyze the Changes

Read the diff, modified files, and commit messages. Determine:

1. **Change type**: feature, bugfix, refactor, dependency update, config change, migration
2. **Changed file paths**: full list for risk pattern matching
3. **Functional areas**: map changed files to logical areas (e.g., `src/api/payments/` -> "payments")
4. **Commit messages**: extract intent and scope

### Step 3: Check Prior Output

Check session `skillHistory` for prior `pr-review` invocations:

- If prior pr-review found for same scope: add note "Note: A pr-review was generated earlier this session for {scope}. Generating fresh review."
- If no prior invocation: continue without note.

Always generate full output regardless of prior invocations.

### Step 4: Change-Impact Analysis

Map changed files to affected user flows and regression areas:

1. **Static risk matching**: Match changed file paths against `references/risk-patterns.md` file patterns for the detected tech stack
2. **Dynamic risk overlay**: Cross-reference changed file areas with project state `risks[]` -- boost risk level per `references/risk-patterns.md` Dynamic Risk Enhancement priority rules
3. **Coverage gap flagging**: Check `coverageGaps[]` against changed areas -- flag areas with known gaps: `⚠️ Coverage gap: {area}`
4. **Monorepo cross-package check**: If `detection.monorepo` is set and changed files span multiple workspace packages, flag: `🔴 Cross-package change`
5. **Upstream dependency analysis**: Read `skills/regression-planner/references/impact-analysis.md` for shared upstream dependency patterns. Identify modules that import or depend on changed files
6. **Affected user flows**: List specific user-facing flows that touch changed areas as explicit regression targets (e.g., "checkout flow" not "payments module")

Cold start: Use only static risk matching (steps 2-4 skipped, step 5 uses file-based heuristics only).

### Step 5: Generate Review

Load risk patterns from `references/risk-patterns.md` (includes Dynamic Risk Enhancement rules).
Apply review criteria from `references/review-criteria.md` (includes State-Context-Informed Criteria).

Generate each output section per the Output Section Order below.

**QA checklist requirement:** Every checklist item MUST reference specific functionality from the diff -- not generic items like "test edge cases" but "test error handling for the new /api/payments endpoint added in src/routes/payments.ts". Items that could apply to any PR without modification are not acceptable.

### Step 6: Format with Context Preamble

Read `shared/references/context-preamble.md` and generate the context preamble.

The "Why" line for pr-review:

```markdown
> **Project Context**
> Stack: {languages} | Frameworks: {frameworks}
> Known Risks: {risk1.area} ({risk1.count} occurrences), {risk2.area} ({risk2.count} occurrences)
> Coverage Gaps: {gap1.area}, {gap2.area}
> Session: Testing {featureUnderTest} | Prior: {priorSkillSummary}
>
> **Why this review:** {stack} detected -- loading {stack}-specific risk patterns.
> Known risk areas ({risk1}, {risk2}) checked against diff scope.
> {N} coverage gaps will be flagged if changes touch those areas.
```

Cold-start preamble per `shared/references/context-preamble.md` Section 2.

### Step 7: Write Session State

After generating the review, write structured findings to session state:

```bash
node scripts/state-manager.js write session skillHistory '{
  "skill": "pr-review",
  "feature": "<pr-summary>",
  "timestamp": "<ISO-8601>",
  "changeSummary": "<1-line what changed>",
  "changeType": "feature|bugfix|refactor|config|migration|dependency",
  "riskLevel": "low|medium|high|critical",
  "affectedAreas": ["<area1>", "<area2>"],
  "regressionSurface": ["<area1>", "<area2>"],
  "qaChecklistCount": 5,
  "riskFlags": ["database-migration", "auth-change"]
}'

node scripts/state-manager.js merge session findings '{
  "area": "<pr-scope>",
  "type": "pr-review",
  "summary": "<risk level> risk PR: <change summary>. Affected areas: <areas>. Regression surface: <areas>"
}'
```

**Downstream consumption:** `affectedAreas` and `regressionSurface` are consumed by `regression-planner` to seed impact analysis. `riskFlags` and `affectedAreas` are consumed by `test-cases` for targeted test generation.

## Output Section Order

1. **Context preamble** -- blockquote with project context (Step 6)
2. **Prior output note** -- if applicable (Step 3)
3. **What Changed** -- 1-3 sentence plain-English summary from a user's perspective
4. **Change Classification** -- type, scope, risk level
5. **State Context** -- per `references/review-criteria.md` State Context Section template (omit if cold start)
6. **Risk Flags** -- static flags from `references/risk-patterns.md` AND dynamic flags from state (`⚠️ Known risk area: {area} ({count} prior issues)`, `⚠️ Coverage gap: {area}`, `🔴 Cross-package change`)
7. **Change-Impact Analysis** -- file-to-area mapping with state signals, affected user flows, upstream dependencies
8. **QA Checklist** -- numbered, diff-specific items referencing actual changed functionality
9. **Regression Areas** -- existing functionality that could break, derived from Step 4
10. **Recommendation** -- Approve / Needs Testing / Request Changes with rationale
11. **Cold-start footer** -- if applicable, per `shared/references/cold-start-pattern.md`

## Save

Save to `qa-artifacts/pr-reviews/pr-review-YYYY-MM-DD-<brief>.md`

Apply format from `--format` argument (default: markdown). See `shared/references/output-formats.md` for table reformatting options.
Use context-based save path per `shared/references/artifact-organization.md`.

## Adapting

For stack-specific risk patterns with dynamic enhancement rules, read `references/risk-patterns.md`.
For review criteria with state-context conditions, read `references/review-criteria.md`.
For upstream dependency and shared module analysis patterns, read `skills/regression-planner/references/impact-analysis.md`.
For state reading and writing patterns, read `shared/references/state-integration.md`.
For context preamble formatting, read `shared/references/context-preamble.md`.

## Suggested Next Steps

After generating the review, suggest based on results:

- If Risk Level is **Medium or higher**: "Consider running `/qa-toolkit:regression-planner` to map the impact radius and plan targeted regression testing." If findings were written to session state: "(PR review findings from this session will be used automatically.)"
- Always: "Generate test cases for the changed functionality with `/qa-toolkit:test-cases`." If findings were written to session state: "(PR review risk areas and affected areas will inform test prioritization.)"
