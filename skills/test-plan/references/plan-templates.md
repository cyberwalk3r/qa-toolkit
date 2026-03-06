# Test Plan Section Templates

Section-by-section templates for generating project-specific test plans. Each section has a "With State" variant (grounded in detection data) and a "Cold-Start" variant (generic defaults).

## 1. Scope

Define what is in and out of scope for testing based on the input requirements.

### With State

Extract scope items from the input PRD/epic and cross-reference with project detection data:

- **In Scope:** Map each input requirement to a testable scope item. Prioritize items that overlap with `coverageGaps[]` areas (these represent under-tested functionality). Reference `detection.frameworks` to identify integration boundaries (e.g., if React + Express detected, API contract testing is in scope).
- **Out of Scope:** Explicitly exclude areas not mentioned in input. Exclude third-party service internals (only test integration points). Exclude performance baselines unless the input mentions performance requirements.
- **Priority Areas:** Items matching `coverageGaps[]` entries get elevated priority. Items matching `risks[]` areas are flagged as high-attention scope items.

Template:
```markdown
### Scope

**In Scope:**
- {requirement-1} -- {mapped testable area}
- {requirement-2} -- {mapped testable area}
- Integration: {framework-A} <-> {framework-B} contract ({detected from stack})
- **Priority:** {coverageGap area} -- identified as coverage gap

**Out of Scope:**
- {excluded-area-1} -- {reason}
- Third-party internals ({detected services}) -- integration points only

**Scope Traceability:**
| Requirement | Scope Area | Priority | Rationale |
|---|---|---|---|
| {REQ-1} | {area} | High | Overlaps coverage gap: {gap} |
| {REQ-2} | {area} | Normal | Standard coverage |
```

### Cold-Start

Extract scope directly from input text without state grounding:

```markdown
### Scope

**In Scope:**
- {requirement-1} -- {mapped testable area}
- {requirement-2} -- {mapped testable area}

**Out of Scope:**
- Areas not mentioned in requirements
- Third-party service internals

**Scope Traceability:**
| Requirement | Scope Area | Priority | Rationale |
|---|---|---|---|
| {REQ-1} | {area} | Normal | From requirements |
```

---

## 2. Test Approach

Decision tree for selecting testing types based on the detected stack and input requirements.

### With State

Map `detection.testFrameworks` and `detection.frameworks` to testing types:

| Stack Signal | Testing Type | Approach Detail |
|---|---|---|
| `testFrameworks` includes Jest/Vitest/Mocha | Unit Testing | Use detected runner. Match `testingConventions[]` for describe/it patterns. |
| `testFrameworks` includes Playwright/Cypress/Selenium | E2E Testing | Use detected E2E framework. Reference `detection.existingTestDirs` for file placement. |
| `testFrameworks` includes pytest/unittest | Unit Testing (Python) | Use detected Python test runner. Follow detected conventions. |
| `frameworks` includes Express/Fastify/NestJS | API/Integration Testing | Test endpoint contracts, middleware chains, auth flows. |
| `frameworks` includes React/Vue/Angular | Component Testing | Test component rendering, state management, user interactions. |
| `frameworks` includes Next.js/Nuxt | SSR/SSG Testing | Test server rendering, hydration, routing, API routes. |
| `risks[]` mentions area | Focused Testing | Increase test density in risk areas. Add negative and boundary tests. |
| `coverageGaps[]` mentions area | Gap Coverage | Explicitly target under-tested areas with dedicated test suites. |

Template:
```markdown
### Test Approach

**Testing Types:**

| Type | Scope | Tools | Priority |
|---|---|---|---|
| Unit | {module/component areas} | {detected test framework} | High |
| Integration | {API/service boundaries} | {detected framework} | High |
| E2E | {user workflows from requirements} | {detected E2E framework} | Medium |
| Performance | {areas with performance requirements} | {recommend based on stack} | {based on input} |
| Security | {auth, input handling, data access} | {recommend based on stack} | High |
| Accessibility | {UI areas if frontend detected} | {axe/lighthouse if web} | Medium |

**Approach Notes:**
- {framework}-specific strategy: {concrete guidance based on detected framework}
- Convention alignment: tests follow {detected pattern, e.g., "describe/it blocks", "pytest fixtures"}
- Package manager: `{detection.packageManager}` for all install/run commands
```

### Cold-Start

When no frameworks are detected, recommend a balanced approach:

```markdown
### Test Approach

**Testing Types:**

| Type | Scope | Recommended Tools | Priority |
|---|---|---|---|
| Unit | Core business logic | Jest, pytest, or framework equivalent | High |
| Integration | Service boundaries, API contracts | Supertest, requests, or equivalent | High |
| E2E | Critical user workflows | Playwright or Cypress | Medium |
| Performance | Response time, load capacity | k6, Artillery, or equivalent | Low |
| Security | Auth, input validation, data access | OWASP ZAP, manual review | Medium |

Select tools based on your project's tech stack. Run `/qa-setup` for auto-detected recommendations.
```

---

## 3. Environments

Pre-fill environment requirements from project detection data.

### With State

Populate from `detection.languages`, `detection.frameworks`, `detection.packageManager`, and CI/CD signals:

```markdown
### Environments

| Environment | Purpose | Configuration |
|---|---|---|
| Local Dev | Unit + integration tests | {languages} runtime, {packageManager}, {frameworks} |
| CI Pipeline | Automated test execution | {detected CI if available, else "Configure CI runner"} |
| Staging | E2E + acceptance testing | Production-like with {frameworks} deployed |
| Production-like | Performance + security testing | Full stack: {languages} + {frameworks} + {databases if detected} |

**Runtime Requirements:**
- Language: {detection.languages} (version from project config if available)
- Package Manager: {detection.packageManager}
- Frameworks: {detection.frameworks}
- Test Frameworks: {detection.testFrameworks}

**Data Requirements:**
- Test data seeding strategy for each environment
- Data isolation between test runs
- PII/sensitive data handling in non-production environments
```

### Cold-Start

```markdown
### Environments

| Environment | Purpose | Configuration |
|---|---|---|
| Local Dev | Unit + integration tests | Local runtime with test dependencies |
| CI Pipeline | Automated test execution | Configure CI runner with test stage |
| Staging | E2E + acceptance testing | Production-like deployment |
| Production-like | Performance + security testing | Full stack deployment |

**Data Requirements:**
- Test data seeding strategy for each environment
- Data isolation between test runs
- PII/sensitive data handling in non-production environments

Configure environment details based on your project's tech stack.
```

---

## 4. Schedule and Estimates

Complexity-based estimation heuristics using test phases, not calendar time.

### With State

Factor in existing coverage from `coverageGaps[]` to adjust effort:

```markdown
### Schedule and Estimates

**Test Phases:**

| Phase | Activities | Relative Effort | Dependencies |
|---|---|---|---|
| 1. Smoke | Core happy-path tests for each scope area | Low (10-15%) | Build deployed to test environment |
| 2. Functional | Full test case execution for all scope areas | High (40-50%) | Smoke phase passed |
| 3. Regression | Existing test suite + new tests for changed areas | Medium (20-25%) | Functional phase passed |
| 4. Exploratory | Charter-based sessions targeting risk areas | Medium (15-20%) | Functional phase passed |
| 5. Acceptance | Entry/exit criteria verification | Low (5-10%) | All prior phases complete |

**Effort Adjustments:**
- Coverage gaps in {gap areas}: +{estimate}% effort for gap coverage testing
- Known risks in {risk areas}: +{estimate}% effort for focused risk testing
- {N} scope areas identified: base effort multiplier

**Complexity Assessment:**
| Factor | Rating | Impact |
|---|---|---|
| Scope breadth (number of features) | {Low/Medium/High} | Affects functional phase duration |
| Integration complexity (service boundaries) | {Low/Medium/High} | Affects integration test effort |
| Risk density (known risks per scope area) | {Low/Medium/High} | Affects exploratory phase depth |
| Existing coverage (from state) | {Good/Partial/None} | Reduces regression effort if good |
```

### Cold-Start

```markdown
### Schedule and Estimates

**Test Phases:**

| Phase | Activities | Relative Effort | Dependencies |
|---|---|---|---|
| 1. Smoke | Core happy-path tests for each scope area | Low (10-15%) | Build deployed to test environment |
| 2. Functional | Full test case execution for all scope areas | High (40-50%) | Smoke phase passed |
| 3. Regression | Existing test suite + new tests for changed areas | Medium (20-25%) | Functional phase passed |
| 4. Exploratory | Charter-based sessions targeting risk areas | Medium (15-20%) | Functional phase passed |
| 5. Acceptance | Entry/exit criteria verification | Low (5-10%) | All prior phases complete |

Adjust estimates based on your team's familiarity with the codebase and existing test coverage.
```

---

## 5. Risks

Merge project state risks with PRD-derived risks into a structured risk matrix.

### With State

Pre-populate from `risks[]` and `session.findings[]`, then augment with input-derived risks:

```markdown
### Risks

**Risk Matrix:**

| ID | Risk | Source | Likelihood | Impact | Severity | Mitigation |
|---|---|---|---|---|---|---|
| R-01 | {risk from state risks[]} | Project State | {L/M/H} | {L/M/H} | {computed} | {mitigation strategy} |
| R-02 | {risk from session findings[]} | Session Findings | {L/M/H} | {L/M/H} | {computed} | {mitigation strategy} |
| R-03 | {risk derived from PRD input} | Requirements | {L/M/H} | {L/M/H} | {computed} | {mitigation strategy} |

**Severity Calculation:**

|  | Low Impact | Medium Impact | High Impact |
|---|---|---|---|
| **High Likelihood** | Medium | High | Critical |
| **Medium Likelihood** | Low | Medium | High |
| **Low Likelihood** | Low | Low | Medium |

**Risk Categories:**
- **Technical:** Architecture complexity, integration failures, data migration, performance bottlenecks
- **Quality:** Insufficient test coverage, flaky tests, environment instability
- **Schedule:** Scope creep, dependency delays, resource unavailability
- **Security:** Known vulnerabilities in {risk areas from state}, auth bypass, data exposure

**State-Informed Risk Notes:**
- {risk.area} has {risk.count} prior occurrences -- elevated to {severity}
- {finding.area} flagged by {finding.type} skill -- included as quality risk
- Coverage gaps in {gap.area} -- included as quality risk (under-tested)
```

### Cold-Start

```markdown
### Risks

**Risk Matrix:**

| ID | Risk | Source | Likelihood | Impact | Severity | Mitigation |
|---|---|---|---|---|---|---|
| R-01 | {risk derived from PRD input} | Requirements | {L/M/H} | {L/M/H} | {computed} | {mitigation strategy} |

**Severity Calculation:**

|  | Low Impact | Medium Impact | High Impact |
|---|---|---|---|
| **High Likelihood** | Medium | High | Critical |
| **Medium Likelihood** | Low | Medium | High |
| **Low Likelihood** | Low | Low | Medium |

**Risk Categories:**
- **Technical:** Architecture complexity, integration failures, data migration
- **Quality:** Test coverage adequacy, environment stability
- **Schedule:** Scope changes, resource constraints
- **Security:** Authentication, authorization, data handling

Run `/qa-setup` to detect project-specific risks for more targeted risk assessment.
```

---

## 6. Entry and Exit Criteria

Standard criteria with stack-aware additions based on detected frameworks.

### With State

Add framework-specific criteria based on `detection.testFrameworks` and `detection.frameworks`:

```markdown
### Entry/Exit Criteria

**Entry Criteria (testing can begin when):**
- [ ] Requirements reviewed and scope approved
- [ ] Test environment provisioned with {detected stack}
- [ ] Test data seeded for all scope areas
- [ ] {detected testFramework} configured and baseline tests passing
- [ ] Build deployed to test environment via {packageManager} scripts
- [ ] Known blockers from prior sessions resolved

**Exit Criteria (testing is complete when):**
- [ ] All P0 (Smoke) test cases passing
- [ ] All P1 (Critical) test cases passing or with documented exceptions
- [ ] P2 (Extended) test cases: >= 90% passing
- [ ] {detected testFramework} test suite: all tests passing (`{packageManager} test`)
- [ ] No unresolved Critical or High severity defects
- [ ] Exploratory testing sessions completed for all risk areas
- [ ] Coverage gaps from state addressed with new tests
- [ ] Risk items mitigated or accepted with documented rationale
- [ ] Test summary report generated

**Framework-Specific Criteria:**
{For each detected test framework, add specific pass conditions:}
- {testFramework}: All {testFramework} tests pass (`{run command}`)
- {E2E framework}: All E2E scenarios pass in CI environment
- {Linter if detected}: No new linting violations introduced
```

### Cold-Start

```markdown
### Entry/Exit Criteria

**Entry Criteria (testing can begin when):**
- [ ] Requirements reviewed and scope approved
- [ ] Test environment provisioned
- [ ] Test data seeded for all scope areas
- [ ] Test framework configured and baseline passing
- [ ] Build deployed to test environment

**Exit Criteria (testing is complete when):**
- [ ] All P0 (Smoke) test cases passing
- [ ] All P1 (Critical) test cases passing or with documented exceptions
- [ ] P2 (Extended) test cases: >= 90% passing
- [ ] No unresolved Critical or High severity defects
- [ ] Exploratory testing sessions completed for risk areas
- [ ] Test summary report generated
```

---

## 7. Resource Requirements

Derive resource needs from scope and test approach, grounded in project state.

### With State

Reference detected tools and frameworks for concrete resource lists:

```markdown
### Resource Requirements

**Tools:**
| Tool | Purpose | Source |
|---|---|---|
| {detected testFramework} | Unit/integration test execution | Detected in project |
| {detected E2E framework} | End-to-end test execution | Detected in project |
| {packageManager} | Dependency management and script execution | Detected in project |
| {additional tools based on approach} | {purpose} | Recommended |

**Environments:**
- {N} environments required (from Environments section)
- Resource specifications per environment (CPU, memory, storage)
- External service access (APIs, databases, third-party integrations)

**Skills/Knowledge:**
- {detected framework} testing expertise
- {detected language} development and debugging
- Domain knowledge: {derived from input scope areas}
- Test automation: {detected testFramework} authoring

**Data:**
- Test data sets for each scope area
- Mock/stub data for external service dependencies
- Performance test data volumes
```

### Cold-Start

```markdown
### Resource Requirements

**Tools:**
| Tool | Purpose | Notes |
|---|---|---|
| Test framework | Unit/integration test execution | Select based on project stack |
| E2E framework | End-to-end test execution | Playwright or Cypress recommended |
| CI/CD pipeline | Automated test execution | GitHub Actions, GitLab CI, or equivalent |

**Environments:**
- Development, staging, and production-like environments
- Resource specifications based on application requirements
- External service access as needed

**Skills/Knowledge:**
- Testing methodology and test case design
- Project domain knowledge
- Test automation for selected framework

**Data:**
- Test data sets for each scope area
- Mock/stub data for external dependencies

Run `/qa-setup` for project-specific tool recommendations.
```
