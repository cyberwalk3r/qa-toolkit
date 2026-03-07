# Playwright Convention Scanner

On-demand scanning logic for extracting conventions from existing Playwright test files. Follow these heuristics when the e2e-test skill workflow triggers a convention scan.

## When to Scan

**Trigger:** `detection.testFrameworks` includes "Playwright" AND session state `playwrightConventions` is null or missing.

**Skip:** If `playwrightConventions` is already cached in session state (scanned earlier this session).

```bash
# Check for cached conventions
CACHED=$(node scripts/state-manager.js read session playwrightConventions)
# If CACHED is non-null and non-empty, use it and skip scanning
```

## Finding Test Files

1. Read `conventions.testPatterns.testDirs` from project state for known test directories
2. If no directories from detection, check common locations: `tests/`, `test/`, `e2e/`, `src/tests/`
3. Glob for `*.spec.ts`, `*.spec.js`, `*.test.ts`, `*.test.js` in those directories
4. Pick 2-3 representative files, prioritizing:
   - Files in the root test directory (not deeply nested)
   - Most recently modified files
   - Largest files (likely demonstrate the most conventions)
5. Cap at 3 files to limit context usage

## What to Extract

For each selected file, identify these 7 convention dimensions:

### Import Style
- `import { test } from '@playwright/test'` -> ESM
- `const { test } = require('@playwright/test')` -> CJS
- Record: `"importStyle": "esm"` or `"cjs"`

### Fixture Pattern
- Presence of `test.extend<` or `test.extend({` -> custom fixtures
- Plain `{ page }` destructuring in test callbacks -> direct instantiation
- Record: `"fixturePattern": "custom"` or `"direct"`

### Page Object Pattern
- Imports from `pages/`, `page-objects/`, or similar directories
- Class names matching `*Page`, `*.page` pattern
- Record: `"pomPath": "tests/pages/"` and `"pomFiles": ["LoginPage.ts", ...]`

### Selector Strategy
Count occurrences across scanned files. Majority wins:
- `data-testid` or `getByTestId` -> `"data-testid"`
- `getByRole` -> `"role-based"`
- `getByLabel` -> `"label-based"`
- CSS selectors (`.class`, `#id`, `tag`) -> `"css"`
- Record: `"selectorStrategy": "data-testid"`

### Test Organization
- `describe` blocks -> `"describe"`
- `test.step()` usage -> note as `"usesSteps": true`
- `beforeEach`/`afterEach`/`beforeAll`/`afterAll` -> note presence
- Record: `"organizationPattern": "describe"`

### Assertion Style
- Note most commonly used `expect` matchers (e.g., `toBeVisible`, `toHaveText`, `toHaveURL`)
- Record: `"commonAssertions": ["toBeVisible", "toHaveText"]`

### Language
- `.ts` extension -> TypeScript
- `.js` extension -> JavaScript
- Record: `"language": "typescript"` or `"javascript"`

## Finding Existing Page Objects

Scan these directories for page object files:
- `tests/pages/`, `tests/page-objects/`
- `test/pages/`, `test/page-objects/`
- `e2e/pages/`, `e2e/page-objects/`
- `src/tests/pages/`, `__tests__/pages/`

File patterns: `*Page.ts`, `*Page.js`, `*.page.ts`, `*.page.js`

Content validation (confirm it is a POM, not just a matching filename):
- Class-based: contains `class` + `constructor` + `page` parameter
- Functional: exports functions or objects that accept a `page` parameter

Output a list of found page objects with names and paths for reuse in test generation.

## Caching Results

Write extracted conventions to session state after scanning:

```bash
node scripts/state-manager.js write session playwrightConventions '{
  "importStyle": "esm",
  "fixturePattern": "custom",
  "pomPath": "tests/pages/",
  "pomFiles": ["LoginPage.ts", "CheckoutPage.ts"],
  "selectorStrategy": "data-testid",
  "language": "typescript",
  "organizationPattern": "describe",
  "usesSteps": true,
  "commonAssertions": ["toBeVisible", "toHaveText", "toHaveURL"],
  "scannedFiles": ["tests/login.spec.ts", "tests/checkout.spec.ts"]
}'
```

On subsequent invocations, read cached conventions:

```bash
node scripts/state-manager.js read session playwrightConventions
```

## Fallback: No Test Files Found

When no existing Playwright test files are found:
- Use best-practice defaults: ESM imports, `data-testid` selectors, class-based POM, TypeScript, `describe` blocks
- Note in output: "No existing Playwright tests found -- using best-practice defaults"
- Cache the defaults with `"scannedFiles": []` to skip re-scanning
- This is advisory, not blocking -- the skill continues with defaults and generates usable output
