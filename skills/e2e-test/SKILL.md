---
name: e2e-test
description: Generate convention-grounded, state-aware Playwright E2E test scaffolds from natural-language scenarios with page object reuse and project convention matching.
---

# E2E Test Writer (Playwright)

Generate Playwright E2E tests grounded in the project's actual conventions. Scans existing test files for import style, selector strategy, fixture patterns, and page objects -- then generates code that matches.

## Input

Accept via `$ARGUMENTS`: scenario descriptions and optional flags. Examples:
- "Test that a user can register, log in, and update their profile"
- "Test the shopping cart -- add items, change quantities, remove items, checkout"
- "Verify the admin can ban a user and the user sees an error on next login"

## Workflow

### Step 1: Read State

Read `skills/shared/references/state-integration.md` and execute the state reading commands:

```bash
PROJECT_STATE=$(node scripts/state-manager.js read project)
SESSION_STATE=$(node scripts/state-manager.js read session)
DETECTION=$(node scripts/state-manager.js read project detection)
CONVENTIONS=$(node scripts/state-manager.js read project conventions)
SKILL_HISTORY=$(node scripts/state-manager.js read session skillHistory)
FEATURE=$(node scripts/state-manager.js read session featureUnderTest)
```

Extract: tech stack, test frameworks, test directories, conventions, session feature, prior skill history.

If no state available, use defaults per `skills/shared/references/cold-start-pattern.md`:
- languages: [] (generic examples)
- testFrameworks: [] (Playwright best-practice defaults)
- featureUnderTest: null (derive from $ARGUMENTS)
- skillHistory: [] (no prior output awareness)

Load `shared/references/output-formats.md` for multi-platform format support.
Load `shared/references/artifact-organization.md` for context-based save paths.

### Step 2: Check for Test-Cases Output

Check session `skillHistory` for prior `test-cases` invocations:

```bash
SKILL_HISTORY=$(node scripts/state-manager.js read session skillHistory)
```

- If test-cases entries found for the target feature: reference the test case IDs and feature name. Example: "Scaffolding E2E tests for test cases TC-LOGIN-01 through TC-LOGIN-05 generated earlier this session."
- If test-cases entries found for a different feature: note availability but do not cross-reference.
- If no test-cases entries: proceed without cross-reference.

### Step 3: Convention Scan

**If `detection.testFrameworks` includes Playwright:**

1. Check session state for cached conventions:
   ```bash
   CACHED=$(node scripts/state-manager.js read session playwrightConventions)
   ```
2. If cached and non-null: use cached conventions. Note: "Using conventions from earlier scan."
3. If not cached: read `references/convention-scanner.md` and execute the full scan workflow. Cache results to session state.

**If Playwright NOT detected:**
- Use best-practice defaults: ESM imports, `data-testid` selectors, class-based POM, TypeScript, `describe` blocks.
- Note: "Playwright not detected in project -- using best-practice defaults."

### Step 4: Parse Scenario

From `$ARGUMENTS`:
1. Identify the feature under test (e.g., "shopping cart", "user registration")
2. Break down into discrete user flows and steps
3. Map to test-cases output if available in session (match by feature name or test case IDs)
4. Determine which flows warrant separate test blocks vs combined scenarios

### Step 5: Detect Existing Page Objects

Per `references/convention-scanner.md` POM detection logic:
1. Scan known POM directories for matching page object files
2. Categorize each relevant page object:
   - **Reuse**: existing POM covers needed interactions (cite file path)
   - **Scaffold**: no existing POM for this page/component (note as new, will be generated)
3. When reusing, match the existing POM's constructor and method patterns

### Step 6: Determine Language and Patterns

From conventions (scanned or cached) or detection state:

| Convention | Source | Fallback |
|---|---|---|
| Language (TS/JS) | `playwrightConventions.language` or `detection.languages` | TypeScript |
| Import style | `playwrightConventions.importStyle` | ESM |
| Fixture pattern | `playwrightConventions.fixturePattern` | Direct (`{ page }`) |
| Selector strategy | `playwrightConventions.selectorStrategy` | `data-testid` > role-based > CSS |
| Organization | `playwrightConventions.organizationPattern` | `describe` blocks |

Note which convention was chosen and why (detected vs defaulted) for the context preamble.

### Step 7: Generate Test Code

Produce Playwright test file(s) matching all detected conventions:

- Use the correct import style (`import` vs `require`)
- Use the correct fixture pattern (`test.extend<>` vs direct `{ page }`)
- Use the correct selector strategy throughout
- Use the correct language and file extension (`.spec.ts` or `.spec.js`)
- Include `test.step()` for complex multi-step flows
- Use proper waiting strategies (no hard-coded waits -- see `references/playwright-patterns.md`)
- Reference existing page objects by import path where applicable
- Scaffold new page objects where needed (separate code blocks)
- Add comments explaining what each section does
- Include setup/teardown (`beforeEach`/`afterEach`) if needed

For advanced patterns (fixture integration, POM best practices, waiting strategies), read `references/playwright-patterns.md`.

### Step 8: Generate Context Preamble

Read `skills/shared/references/context-preamble.md` and generate the preamble blockquote.

Include convention scan results in the preamble:
- Which files were scanned for conventions
- What conventions were detected vs defaulted
- Which page objects are being reused vs scaffolded

Example:
> **Project Context**
> Stack: TypeScript | Frameworks: React, Next.js | Test Framework: Playwright
> Conventions detected from: tests/login.spec.ts, tests/checkout.spec.ts
> Import: ESM | Selectors: data-testid | Fixtures: custom (test.extend) | POM: tests/pages/
> Reusing: LoginPage.ts, NavigationPage.ts | New: CartPage.ts
>
> **Why this structure:** Matches existing project conventions scanned from 2 test files. Custom fixtures detected -- test.extend pattern used. Page objects follow existing class-based pattern in tests/pages/.

### Step 9: Write Session State

Write execution summary to session state:

```bash
node scripts/state-manager.js write session skillHistory '{
  "skill": "e2e-test",
  "feature": "<feature>",
  "timestamp": "<ISO-8601>",
  "testFilesGenerated": ["e2e-YYYY-MM-DD-<scenario>.spec.ts"],
  "pageObjectsCreated": ["CartPage.ts"],
  "pageObjectsReused": ["LoginPage.ts"],
  "conventionsUsed": {
    "importStyle": "esm",
    "selectorStrategy": "data-testid",
    "fixturePattern": "custom",
    "language": "typescript"
  }
}'

node scripts/state-manager.js merge session findings '{
  "area": "<feature>",
  "type": "e2e-test",
  "summary": "E2E tests scaffolded: <N> test files, <N> page objects (<reused> reused, <new> new)"
}'
```

Check for prior invocations per `skills/shared/references/state-integration.md` section 4 (Prior Output Awareness). If same feature was tested before, note it but generate full output.

## Output Sections

Produce output in this order:

1. **Context preamble** -- blockquote with project context, convention scan results, and "Why this structure" explanation
2. **Convention notes** -- which files were scanned, what was detected, what defaults were used
3. **Page object status** -- table of existing POMs reused and new ones scaffolded
4. **Generated test file(s)** -- complete, runnable code in fenced code blocks with language tag
5. **New page object scaffolds** -- if any, in separate code blocks matching existing POM style
6. **Fixture updates** -- if custom fixtures needed, show additions to existing `fixtures.ts`
7. **Run instructions** -- reference `scripts/run-test.js` with `--help` for options
8. **Cold-start footer** -- if applicable, per `skills/shared/references/cold-start-pattern.md`
9. **Suggested Next Steps** -- contextual recommendations

## Prior Output Awareness

Check session `skillHistory` for prior `e2e-test` invocations:
- Same feature: "Note: E2E tests for {feature} already generated this session. Generating fresh set -- review for overlap."
- Different feature: no action needed
- No prior: no action needed

Always generate full output regardless.

## Reference Loading

| Reference | When to Load |
|---|---|
| `skills/shared/references/state-integration.md` | Always (step 1) |
| `skills/shared/references/context-preamble.md` | Always (step 8) |
| `references/convention-scanner.md` | When Playwright detected AND no cached conventions (step 3) |
| `references/playwright-patterns.md` | Always for advanced patterns (step 7) |
| `skills/shared/references/cold-start-pattern.md` | When state reading returns empty (step 1) |

## Save

Save to `qa-artifacts/e2e-tests/e2e-YYYY-MM-DD-{scenario}.spec.{ts|js}`

Match the detected language for file extension. Use `.ts` when TypeScript detected or defaulted, `.js` when JavaScript detected.

Format from `shared/references/output-formats.md` applies to documentation headers only, not generated test code.
Use context-based save path per `shared/references/artifact-organization.md`.

## Suggested Next Steps

After generating E2E tests, suggest based on context:
- **If accessibility not yet run this session:** "Run an accessibility audit on the same pages with `/qa-toolkit:accessibility`."
- **If test-data skill available:** "Generate test data fixtures for the scenarios with `/qa-toolkit:test-data`."
- **If test-cases not yet run for this feature:** "Generate structured test cases first with `/qa-toolkit:test-cases` for traceability IDs."
- **Always:** "Review generated page objects and merge with existing ones if overlap detected."
