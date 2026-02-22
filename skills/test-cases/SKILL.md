---
name: test-cases
description: Generate test cases from requirements in table, Gherkin BDD, or checklist format
---

# Test Case Generator

Generate test cases from any requirements input. Read `qa-artifacts/.qa-config.json` for project context.

## Input
Accept via `$ARGUMENTS`: user stories, PRD excerpts, feature descriptions, Jira ticket content, PR descriptions, or casual feature explanations.

## Workflow

1. **Parse the requirement** — identify the feature, actors, and expected behavior
2. **Identify testable scenarios** across these dimensions:
   - **Happy path** — normal expected flow
   - **Negative cases** — invalid inputs, unauthorized access, missing data
   - **Boundary values** — min, max, empty, one-off limits
   - **Edge cases** — concurrent actions, timeouts, network failures
   - **Security** — injection, XSS, CSRF, auth bypass
   - **Performance** — load, stress, response time
3. **Prioritize** each test case:
   - **P0 (Smoke)** — must pass for any release, core functionality
   - **P1 (Critical)** — essential for feature completeness
   - **P2 (Extended)** — important edge cases and integration
   - **P3 (Exploratory)** — nice-to-have, deep edge cases
4. **Format output** based on user preference or default to table

## Output Format — Table (Default)

| # | Test Case | Steps | Expected Result | Priority | Type |
|---|-----------|-------|-----------------|----------|------|
| 1 | ... | ... | ... | P0 | Happy Path |

## Output Format — Gherkin BDD
For BDD format, read `references/bdd-patterns.md`.

```gherkin
Feature: <feature name>

  Scenario: <scenario description>
    Given <precondition>
    When <action>
    Then <expected result>
```

## Output Format — Checklist
Simple checkbox format for manual testing:
```
## <Feature> Test Cases

### P0 — Smoke Tests
- [ ] <test case description>

### P1 — Critical Tests
- [ ] <test case description>
```

## Traceability
Link each test case back to the original requirement with a reference tag.

## Save
Save to `qa-artifacts/test-cases/tc-YYYY-MM-DD-<feature>.md`
