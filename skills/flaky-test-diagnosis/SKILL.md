---
name: flaky-test-diagnosis
description: Diagnose flaky tests by analyzing test code and failure logs to identify root causes with specific fix recommendations.
---

# Flaky Test Diagnoser

Analyze test code and optional failure logs to identify root causes of test flakiness with specific fix recommendations. Reads project and session state to apply framework-specific flakiness patterns and track diagnosis history across sessions.

## Input

Accept via `$ARGUMENTS`: test file paths, test names, failure log snippets, or CI output.

Examples:
- "Diagnose why test_payment_webhook fails intermittently"
- "Analyze these Playwright test failures: [logs]"
- "Check tests in src/tests/integration/ for flakiness risks"
- "Our CI keeps failing on the checkout flow tests -- here's the output"

Derive from input:
- **Target tests** -- specific files, test names, or directories to analyze
- **Failure logs** -- optional CI output or error messages (changes approach from risk detection to root cause confirmation)
- **Scope label** -- used for save path and state writing

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
CONVENTIONS=$(node scripts/state-manager.js read project testingConventions)
SKILL_HISTORY=$(node scripts/state-manager.js read session skillHistory)
FEATURE=$(node scripts/state-manager.js read session featureUnderTest)
FINDINGS=$(node scripts/state-manager.js read session findings)
```

Extract from project state:
- `detection.testFrameworks` -- critical for framework-specific flakiness patterns (Jest fake timers, Playwright auto-waiting, pytest fixture scoping)
- `detection.languages` -- for language-specific async patterns and timing issues
- `testingConventions[]` -- for identifying deviations from established test patterns
- `risks[]` -- for correlating known risk areas with flaky test locations

Extract from session state:
- `featureUnderTest` -- for scope focus
- `skillHistory[]` -- for prior flaky-test-diagnosis runs (track resolution progress)
- `findings[]` -- for cross-referencing prior skill findings

If no state available (cold start), use defaults per `shared/references/cold-start-pattern.md`. Every conditional below has a fallback.

Load `shared/references/output-formats.md` for multi-platform format support.
Load `shared/references/artifact-organization.md` for context-based save paths.

### Step 2: Parse Input

From `$ARGUMENTS`, identify:
- **Target tests** -- specific file paths, test names, `describe` block names, or directories
- **Failure logs** -- CI output, error messages, stack traces (if provided)
- **Test framework** -- from state `detection.testFrameworks` or inferred from input (file extensions, import patterns)

Determine analysis mode:
1. **Root cause confirmation** (failure logs provided) -- correlate error messages with root cause patterns, higher confidence
2. **Risk detection** (no failure logs) -- static analysis of test code for flakiness signals, lower confidence

Derive scope label for save path:
1. Explicit scope from user input (preferred)
2. Session state `featureUnderTest` (if set)
3. Inferred from file paths or test names (fallback)

Normalize: lowercase, hyphens only (e.g., "Payment Webhook Tests" -> "payment-webhook").

### Step 3: Check Prior Output

Check session `skillHistory` for prior `flaky-test-diagnosis` invocations:

- If prior invocation found for **same scope**: add note at top of output: "Note: A flaky test diagnosis for {scope} was already generated this session. Generating fresh diagnosis -- compare with prior run to track resolution progress."
- If no prior invocation: continue without note.

When prior diagnosis exists, compare:
- Tests that were flaky before and still appear -- flag as **unresolved**
- Tests from prior run not appearing now -- flag as **potentially resolved**
- New flaky tests not in prior run -- flag as **new**

Always generate full output regardless of prior invocations.

### Step 4: Diagnose Flakiness

Read `references/flakiness-patterns.md` for the root cause catalog, framework-specific patterns, and fix strategy decision tree.

For each target test:

1. **Identify matching root cause category:**
   - Timing/Async
   - Shared State
   - External Dependency
   - Test Order Dependence
   - Resource Contention
   - Environment Differences

2. **Count detection signals matched** from the root cause catalog:
   - **High confidence** -- 3+ signals matched, or failure log directly confirms root cause
   - **Medium confidence** -- 2 signals matched
   - **Low confidence** -- 1 signal matched or pattern is ambiguous

3. **Generate specific fix strategy** per root cause (not vague "fix timing" but concrete code-level recommendations):
   - Reference the fix strategy decision tree in `references/flakiness-patterns.md`
   - Include code snippets showing the anti-pattern and the fix
   - Adapt fix examples to detected test framework from state

4. **Correlate with failure logs** (if provided):
   - Match error messages to root cause patterns (timeout -> Timing, "expected X received Y" with state leak -> Shared State)
   - Elevated confidence when log evidence confirms pattern

5. **Apply framework-specific patterns** from `references/flakiness-patterns.md`:
   - Jest: fake timers, module mock leakage, jsdom environment
   - Playwright: networkidle, selector timing, browser context
   - pytest: fixture scope, parametrize ordering, conftest side effects
   - Vitest: watch mode isolation

### Step 5: Format Output

Read `shared/references/context-preamble.md` and generate the context preamble.

**Context preamble "Why" line:**

When state is available:
```
> **Why this diagnosis:** {testFramework} detected -- applying {framework}-specific flakiness patterns.
> Known risks ({risk areas}) cross-referenced with flaky test locations.
```

When cold start:
```
> **Project Context**
> Stack: Not detected | Test Framework: Not detected
>
> **Why this diagnosis:** General flakiness pattern analysis across all categories. Run `/qa-setup` or start a new session for framework-specific diagnosis.
```

**Diagnosis table:**

```markdown
### Flaky Test Diagnosis

| Test | Root Cause | Category | Confidence | Fix Strategy |
|---|---|---|---|---|
| {test name/file} | {specific root cause} | {category} | High/Medium/Low | {concrete fix recommendation} |
```

**Category summary:**

```markdown
### Category Summary

| Category | Count | % of Total |
|---|---|---|
| Timing/Async | {n} | {%} |
| Shared State | {n} | {%} |
| External Dependency | {n} | {%} |
| Test Order Dependence | {n} | {%} |
| Resource Contention | {n} | {%} |
| Environment Differences | {n} | {%} |
```

**Prevention recommendations** section with actionable practices to prevent future flakiness, prioritized by most common categories found.

### Step 6: Write Session State

After generating output, write execution summary to session state:

```bash
node scripts/state-manager.js write session skillHistory '{
  "skill": "flaky-test-diagnosis",
  "feature": "<scope>",
  "timestamp": "<ISO-8601>",
  "testsAnalyzed": <count>,
  "flakyCount": <count>,
  "byCategory": {
    "timing": <n>,
    "sharedState": <n>,
    "externalDep": <n>,
    "orderDependence": <n>,
    "resourceContention": <n>,
    "environment": <n>
  },
  "fixPriority": ["<most-impactful-fix>", "<second-fix>"]
}'

node scripts/state-manager.js merge session findings '{
  "area": "<scope>",
  "type": "flaky-test",
  "summary": "Flaky test diagnosis: <N> tests analyzed, <N> flaky (<breakdown by category>)"
}'
```

### Step 7: Save

Save to `qa-artifacts/flaky-diagnosis/flaky-diagnosis-YYYY-MM-DD-<scope>.md`

Apply format from `--format` argument (default: markdown). See `shared/references/output-formats.md` for table reformatting options.
Use context-based save path per `shared/references/artifact-organization.md`.

## Output Section Order

1. **Context preamble** -- blockquote with project context and "Why this diagnosis" line
2. **Prior output note** -- if applicable (Step 3), with resolution tracking
3. **Flaky Test Diagnosis** -- table with root cause classification and confidence levels
4. **Category Summary** -- breakdown by root cause type
5. **Prevention Recommendations** -- actionable practices prioritized by findings
6. **Cold-start footer** -- if applicable, per `shared/references/cold-start-pattern.md`
7. **Suggested Next Steps**

## Suggested Next Steps

After diagnosing flaky tests, suggest based on what was found:
- "Run `/qa-toolkit:regression-planner` to exclude or deprioritize flaky tests in regression suite." (always)
- "Flaky test findings from this session will inform regression planning automatically." (when findings written to state)
- "Consider running `/qa-toolkit:test-cases` to generate stable replacements for unfixable flaky tests." (when High confidence flaky tests found with no viable fix)
- "Run `/qa-toolkit:exploratory-testing` on areas with shared state flakiness to identify deeper coupling issues." (when Shared State category is dominant)
