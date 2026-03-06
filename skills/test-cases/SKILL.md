---
name: test-cases
description: Generate structured test cases from any requirements input — user stories, PRDs, acceptance criteria, Jira tickets, or vague feature descriptions — in table, Gherkin, checklist, or JSON format with traceability IDs. Use this skill whenever a user provides requirements and wants to know what to test, asks "write test cases for X", or shares a feature description, even informally.
---

# Test Case Generator

Generate structured test cases from any requirements input. Reads project and session state to produce context-aware output grounded in the actual tech stack, with traceability IDs, inline risk annotations, and stack-aware test dimensions.

## Input

Accept via `$ARGUMENTS`: user stories, PRD excerpts, feature descriptions, Jira ticket content, PR descriptions, or casual feature explanations.

Optional flags in `$ARGUMENTS`:
- `--format table|gherkin|checklist|json` -- override format auto-selection
- Feature name for traceability prefix (e.g., "login feature" -> TC-LOGIN-NN)

## Workflow

### Step 1: Read State

Read `shared/references/state-integration.md` for the full state reading pattern.

Execute state reading commands:

```bash
PROJECT_STATE=$(node scripts/state-manager.js read project)
SESSION_STATE=$(node scripts/state-manager.js read session)
RISKS=$(node scripts/state-manager.js read project risks)
COVERAGE_GAPS=$(node scripts/state-manager.js read project coverageGaps)
```

Extract from project state:
- `detection.languages`, `detection.frameworks`, `detection.testFrameworks` -- for stack-aware dimensions and format selection
- `risks[]` -- for inline risk annotations
- `coverageGaps[]` -- for priority escalation
- `testingConventions[]` -- for matching existing test style

Extract from session state:
- `featureUnderTest` -- for traceability ID prefix fallback
- `skillHistory[]` -- for prior output awareness
- `findings[]` -- for cross-reference

If no state available (cold start), use defaults per `shared/references/cold-start-pattern.md`. Every conditional below has a fallback.

Load `shared/references/output-formats.md` for multi-platform format support.
Load `shared/references/artifact-organization.md` for context-based save paths.

### Step 2: Parse Requirement

From `$ARGUMENTS`, identify:
- **Feature name** -- used as traceability prefix (e.g., "login" -> TC-LOGIN-NN)
- **Actors** -- who performs actions
- **Expected behavior** -- what should happen

Derive feature prefix for traceability IDs:
1. Explicit feature name from user input (preferred)
2. Session state `featureUnderTest` (if set)
3. Inferred noun phrase from requirement text (fallback)

Normalize prefix: uppercase, alphanumeric, hyphens only (e.g., "user login" -> LOGIN, "shopping cart checkout" -> CART-CHECKOUT).

### Step 3: Check Prior Output

Check session `skillHistory` for prior `test-cases` invocations:

- If prior invocation found for **same feature**: add note at top of output: "Note: {count} test cases for {feature} already generated this session (IDs: {ids}). Generating fresh set -- review for overlap."
- If no prior invocation: continue without note.

Always generate full output regardless of prior invocations.

### Step 4: Select Format

**Priority order:**
1. Explicit `--format` in `$ARGUMENTS` -> use requested format
2. Natural language in `$ARGUMENTS` ("in BDD format", "as JSON", "as checklist") -> use requested format
3. BDD signal detection from project state:
   - `detection.testFrameworks` includes Cucumber, Behave, SpecFlow, or pytest-bdd
   - `detection.existingTestDirs` contains "features"
   - If BDD signal found -> Gherkin default
4. No signal -> table default

Output a format selection note: which format was selected, why, and how to override.

### Step 5: Generate Test Cases

**Base 6 dimensions** (always apply):
- **Happy path** -- normal expected flow
- **Negative** -- invalid inputs, unauthorized access, missing data
- **Boundary** -- min, max, empty, one-off limits
- **Edge cases** -- concurrent actions, timeouts, network failures
- **Security** -- injection, XSS, CSRF, auth bypass
- **Performance** -- load, stress, response time

**Stack-aware extras:** Per dimension mapping in `shared/references/state-integration.md`, add dimensions based on detected frameworks. If no frameworks detected, use base 6 only.

**Prioritize** using the matrix from `references/coverage-strategies.md`:
- **P0 (Smoke)** -- core functionality, must pass for any release
- **P1 (Critical)** -- essential for feature completeness
- **P2 (Extended)** -- important edge cases and integration
- **P3 (Exploratory)** -- deep edge cases, nice-to-have

**Priority escalation from state:**
- Test cases targeting a known `risks[]` area -> auto-escalate to P0
- Test cases targeting a `coverageGaps[]` area -> auto-escalate to P1

**Assign traceability IDs:** `TC-{FEATURE}-{NN}` format. Sequential starting at 01, reset per feature.

**Inline risk annotations:** Test cases targeting known risk areas get a bold annotation in the priority field:
- Format: `**P0 -- targets known risk: {area} ({count} occurrences)**`
- This replaces a separate risk section -- risk context lives inline with the test case.

### Step 6: Format Output

Read `shared/references/context-preamble.md` and generate the context preamble.

Then format test cases per the selected format (see Output Formats below).

### Step 7: Write Session State

After generating output, write execution summary to session state:

```bash
node scripts/state-manager.js write session skillHistory '{
  "skill": "test-cases",
  "feature": "<feature>",
  "timestamp": "<ISO-8601>",
  "testCaseCount": <N>,
  "byPriority": {"P0": <n>, "P1": <n>, "P2": <n>, "P3": <n>},
  "riskAreas": ["<area1>"],
  "testCaseIds": ["TC-FEATURE-01", "TC-FEATURE-02"]
}'

node scripts/state-manager.js merge session findings '{
  "area": "<feature>",
  "type": "test-cases",
  "summary": "<N> test cases generated, <n> P0 targeting <risk area>"
}'
```

## Output Formats

### Table (Default)

| ID | Test Case | Steps | Expected Result | Priority | Dimension |
|---|---|---|---|---|---|
| TC-LOGIN-01 | Valid login with correct credentials | 1. Enter email 2. Enter password 3. Submit | Dashboard displayed | P0 | Happy Path |
| TC-LOGIN-02 | SQL injection in email field | 1. Enter `' OR 1=1 --` 2. Submit | Error message, no access | **P0 -- targets known risk: auth (3 occurrences)** | Security |

### Gherkin BDD

Read `references/bdd-patterns.md` when this format is selected for traceability tag integration and risk annotation patterns.

```gherkin
Feature: Login

  Background:
    Given the application is running
    And I am on the login page

  @TC-LOGIN-01 @P0 @happy-path
  Scenario: Valid login with correct credentials
    Given I have a valid user account
    When I enter my email and password
    And I click Sign In
    Then I should be redirected to the dashboard

  # RISK: targets known risk area -- auth module (3 occurrences)
  @TC-LOGIN-02 @P0 @security
  Scenario: SQL injection in email field
    When I enter "' OR 1=1 --" in the email field
    And I click Sign In
    Then I should see an error message
    And I should not be granted access
```

### Checklist

```markdown
## Login Test Cases

### P0 -- Smoke Tests
- [ ] **TC-LOGIN-01** Valid login with correct credentials
- [ ] **TC-LOGIN-02** SQL injection in email field **[RISK: auth module]**

### P1 -- Critical Tests
- [ ] **TC-LOGIN-03** Login with expired session token
```

### JSON

Save as `.json` (not `.md`) when this format is selected.

```json
{
  "metadata": {
    "feature": "Login",
    "generatedAt": "2026-03-06T10:30:00Z",
    "projectStack": ["React", "TypeScript", "Playwright"],
    "totalCases": 12,
    "byPriority": { "P0": 3, "P1": 5, "P2": 3, "P3": 1 },
    "byDimension": {
      "happyPath": 3,
      "negative": 3,
      "boundary": 2,
      "edge": 2,
      "security": 1,
      "performance": 1
    }
  },
  "testCases": [
    {
      "id": "TC-LOGIN-01",
      "title": "Valid user can log in with correct credentials",
      "priority": "P0",
      "dimension": "happyPath",
      "preconditions": ["User account exists", "User is on login page"],
      "steps": [
        { "step": 1, "action": "Enter valid email", "expected": "Email field populated" },
        { "step": 2, "action": "Enter valid password", "expected": "Password field populated" },
        { "step": 3, "action": "Click Sign In", "expected": "Redirected to dashboard" }
      ],
      "expectedResult": "User is logged in and sees dashboard",
      "riskAnnotation": null,
      "tags": ["auth", "smoke"],
      "traceability": "REQ-LOGIN-001"
    }
  ]
}
```

The `steps` array with `action`/`expected` pairs maps to TestRail's separated steps format and Xray's step fields for direct import.

## Output Section Order

1. **Context preamble** -- blockquote with project context, "Why these tests", per `shared/references/context-preamble.md`
2. **Format selection note** -- which format, why, how to override
3. **Prior output note** -- if applicable (Step 3)
4. **Test cases** -- in selected format
5. **Coverage summary** -- counts by priority AND dimension, per `shared/references/context-preamble.md`
6. **Traceability summary** -- IDs generated, linked requirement, feature prefix used
7. **Cold-start footer** -- if applicable, per `shared/references/cold-start-pattern.md`
8. **Suggested Next Steps**

## Save

Save to `qa-artifacts/test-cases/tc-YYYY-MM-DD-{feature}.md`

When JSON format is selected, save to `qa-artifacts/test-cases/tc-YYYY-MM-DD-{feature}.json`

Apply format from `--format` argument (default: markdown). See `shared/references/output-formats.md` for table reformatting options.
Use context-based save path per `shared/references/artifact-organization.md`.

## Suggested Next Steps

After generating test cases, suggest based on what was produced:
- "Generate synthetic test data for these scenarios with `/qa-toolkit:test-data`."
- "Automate the P0/P1 cases as Playwright E2E tests with `/qa-toolkit:e2e-test`." (If test case IDs are in session state, e2e-test can reference them directly.)
- If coverage gaps remain: "Run `/qa-toolkit:coverage-gap` to identify additional areas needing test cases."
- If risks were annotated: "Review risk areas with `/qa-toolkit:risk-prioritization` for deeper analysis."
