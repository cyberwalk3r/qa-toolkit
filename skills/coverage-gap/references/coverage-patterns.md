# Coverage Gap Detection Patterns

Gap categories, detection heuristics, severity classification, and stack-aware patterns for coverage gap analysis. Contains non-obvious, specific guidance for identifying and classifying test coverage gaps.

## Gap Categories

### 1. Untested Requirements

A requirement exists (in PRD, user story, or acceptance criteria) but no test traces to it.

Detection signals:
- Requirement mentions a behavior (e.g., "user can reset password") with no test file or test case referencing that flow
- Acceptance criteria specify conditions (e.g., "returns 403 for unauthorized users") with no corresponding assertion in test files
- Feature flags or configuration options documented but never tested in toggled states

Severity baseline: **Critical** -- requirements without tests represent the highest coverage risk since there is zero validation of specified behavior.

### 2. Untested Code Paths

A source module exists but has no corresponding test file or is not imported by any test.

Detection signals:
- Source file in `src/` or equivalent with no matching file in `test/`, `__tests__/`, or `tests/`
- Module not imported by any test file (grep for import/require statements)
- Code paths within tested files that are never exercised (dead branches in covered modules)

Severity baseline: **High** for business logic modules, **Medium** for utility/helper code, **Low** for config/constants/type definitions.

### 3. Missing Test Types

A module has some tests but lacks important test types given its role.

Detection signals:
- Auth/payment modules with only unit tests (missing integration and security tests)
- API endpoints with only happy-path tests (missing error response, validation, and auth tests)
- Data access layers with only unit tests (missing integration tests with actual DB)
- UI components with only snapshot tests (missing interaction and accessibility tests)

Severity baseline: **High** when the missing type covers a critical dimension (security for auth, integration for APIs), **Medium** otherwise.

### 4. Missing Dimensions

Tests exist but fail to cover important dimensions for the module's role.

Detection signals:
- No negative/error tests for input validation code
- No boundary tests for numeric/string length handling
- No concurrency tests for shared state or queue processing
- No performance tests for data-heavy endpoints or batch operations
- No security tests for authentication, authorization, or data sanitization code

Severity baseline: **Medium** for most dimensions, **High** for security dimensions on auth/payment code.

## Detection Heuristics

### Test File Naming Convention Matching

Map source files to expected test file locations based on common conventions:

| Source Path | Expected Test Path(s) |
|---|---|
| `src/foo.ts` | `src/foo.test.ts`, `src/foo.spec.ts`, `test/foo.test.ts`, `tests/foo.test.ts`, `__tests__/foo.test.ts` |
| `src/foo.js` | `src/foo.test.js`, `src/foo.spec.js`, `test/foo.test.js`, `tests/foo.test.js`, `__tests__/foo.test.js` |
| `src/foo.py` | `tests/test_foo.py`, `test_foo.py`, `tests/foo_test.py` |
| `src/foo.go` | `src/foo_test.go` (same directory) |
| `src/foo.rs` | Inline `#[cfg(test)]` module or `tests/foo.rs` |
| `src/foo.java` | `src/test/.../FooTest.java`, `src/test/.../FooSpec.java` |
| `app/models/foo.rb` | `spec/models/foo_spec.rb`, `test/models/foo_test.rb` |

When `detection.testFrameworks` is available, narrow to the conventions used by the detected framework. When `detection.existingTestDirs` is available, use actual project test directories instead of guessing.

### Directory Structure Comparison

Compare the source tree against the test tree for structural gaps:

1. List all directories under the source root (e.g., `src/`)
2. List all directories under each test root (e.g., `test/`, `__tests__/`)
3. Directories present in source but absent in test tree represent potential module-level gaps
4. Weight by module size (number of files) -- large untested directories are higher severity

### Import Analysis

Test files that import from a source module indicate some level of coverage:

1. Scan test files for import/require statements
2. Build a map of source modules to importing test files
3. Source modules with zero importing test files have no coverage
4. Source modules with few importing test files relative to their export surface have partial coverage

### Framework-Specific Gap Patterns

**React/Vue/Angular:**
- Component files (`*.tsx`, `*.vue`, `*.component.ts`) without corresponding `.test` or `.spec` files
- Custom hooks (`use*.ts`) without hook-specific tests
- Context providers without consumer-side integration tests
- Route components without navigation/routing tests

**Express/Fastify/NestJS:**
- Route handler files without corresponding API test files
- Middleware files without middleware-specific tests (especially auth middleware)
- Error handler modules without error response tests
- Validation schemas without validation test cases

**Django/Flask/Rails:**
- View/controller files without request-level tests
- Model files without model-level tests
- Serializer/form files without serialization tests
- Migration files without migration verification tests

## Severity Classification

### Base Severity Rules

| Gap Type | Code Area | Base Severity |
|---|---|---|
| Untested requirement | Any | Critical |
| Untested code path | Auth, payment, data handling | Critical |
| Untested code path | Core business logic | High |
| Untested code path | Utility, helper | Medium |
| Untested code path | Config, constants, types | Low |
| Missing test type | Security tests for auth code | Critical |
| Missing test type | Integration tests for API endpoints | High |
| Missing test type | E2E for critical user flows | High |
| Missing test type | Performance tests for data endpoints | Medium |
| Missing dimension | Negative tests for validation | High |
| Missing dimension | Boundary tests for numeric handling | Medium |
| Missing dimension | Accessibility for UI components | Medium |

### Escalation Rules

Severity is escalated (bumped up one level, max Critical) when:

1. **Risk area match:** The gap area appears in project state `risks[]`. Rationale: known risk areas with coverage gaps compound the risk.
2. **Pre-existing coverage gap:** The area appears in project state `coverageGaps[]`. Rationale: previously identified and still unfixed indicates systemic neglect.
3. **High churn area:** The area has high recent git commit frequency (if git analysis available). Rationale: frequently changing code without tests is more likely to regress.
4. **Session finding correlation:** A prior skill in this session flagged the same area (e.g., bug-report or risk-prioritization). Rationale: convergent signals from multiple analysis angles.

### State Signal Annotation

Each gap in the output table includes a "State Signal" column explaining escalation:

| Signal | Meaning |
|---|---|
| `Risk: {area}` | Area matches a project risk entry |
| `Known Gap: {area}` | Area matches a pre-existing coverage gap |
| `High Churn` | Area has high recent commit frequency |
| `Session: {skill}` | Prior skill flagged this area |
| `None` | Base severity, no escalation applied |

## Stack-Aware Gap Patterns

### React Applications

| Gap Pattern | Detection Signal | Severity | Recommended Test Type |
|---|---|---|---|
| Component without render test | `.tsx` file, no `.test.tsx` | Medium | Component unit test with React Testing Library |
| Custom hook without test | `use*.ts` file, no `use*.test.ts` | High | Hook test with renderHook |
| No integration test for data flow | Component + API call, no integration test | High | Integration test with MSW or similar |
| No accessibility test | UI component, no axe/a11y assertions | Medium | Accessibility test with axe-core |
| No error boundary test | ErrorBoundary component, no throw simulation test | High | Error boundary test with error injection |

### API Projects (Express, Fastify, NestJS, Django, Flask, Rails)

| Gap Pattern | Detection Signal | Severity | Recommended Test Type |
|---|---|---|---|
| Missing contract test | Route handler, no request/response schema test | High | API contract test (supertest, httpx, rack-test) |
| Missing error response test | Route handler, only 200 tests | High | Negative API test with 4xx/5xx assertions |
| Missing auth middleware test | Auth middleware file, no auth-specific test | Critical | Auth integration test with valid/invalid tokens |
| Missing validation test | Validation schema, no invalid-input tests | High | Input validation test with boundary values |
| Missing rate limit test | Rate limiter configured, no rate limit test | Medium | Rate limit integration test |

### Full-Stack Applications

| Gap Pattern | Detection Signal | Severity | Recommended Test Type |
|---|---|---|---|
| Missing E2E for critical flow | Auth/checkout/onboarding flow, no E2E test | Critical | E2E test with Playwright/Cypress |
| Missing API-to-DB integration | ORM model + API route, no DB integration test | High | Integration test with test database |
| Missing cross-service test | Multiple services/APIs, no cross-service test | High | Contract test or integration test |
| Frontend-backend contract gap | Frontend API calls, no contract verification | Medium | API contract test or MSW-based integration |
