# State Integration Patterns for Skills

Cross-cutting state read/write patterns. All skills that use project or session state follow these exact workflows.

## 1. State Reading Workflow

Execute these Bash commands at the start of skill execution. Parse the JSON output to extract relevant fields.

```bash
# Full project state (tech stack, risks, conventions)
PROJECT_STATE=$(node scripts/state-manager.js read project)

# Full session state (feature under test, prior findings)
SESSION_STATE=$(node scripts/state-manager.js read session)

# Targeted reads for specific fields
DETECTION=$(node scripts/state-manager.js read project detection)
RISKS=$(node scripts/state-manager.js read project risks)
COVERAGE_GAPS=$(node scripts/state-manager.js read project coverageGaps)
CONVENTIONS=$(node scripts/state-manager.js read project testingConventions)
SKILL_HISTORY=$(node scripts/state-manager.js read session skillHistory)
FEATURE=$(node scripts/state-manager.js read session featureUnderTest)
```

### Field Paths and What They Provide

| Field Path | Skill Use |
|---|---|
| `detection.languages` | Language-specific examples, syntax in generated code |
| `detection.frameworks` | Stack-aware test dimensions, framework-specific patterns |
| `detection.testFrameworks` | Format auto-selection (BDD signal), test runner commands |
| `detection.existingTestDirs` | File placement suggestions, convention references |
| `detection.packageManager` | Install/run commands in output (`npm`, `yarn`, `pnpm`) |
| `detection.monorepo` | Workspace-aware path references |
| `conventions.testPatterns` | Naming conventions, file patterns for generated tests |
| `conventions.typescript` | TS config awareness (strict mode, paths) |
| `risks[]` | Inline risk annotations on test cases targeting risk areas |
| `coverageGaps[]` | Priority escalation for under-tested areas |
| `testingConventions[]` | Match existing test style (describe blocks, assertion patterns) |
| `session.featureUnderTest` | Feature prefix for traceability IDs, scope focus |
| `session.skillHistory[]` | Prior output awareness, avoid duplicate suggestions |
| `session.findings[]` | Accumulated session findings for cross-reference |

### Cold-Start Fallback

Every field access must have a default. If `state-manager.js read` returns `null` or an empty object, use fallback values per `skills/shared/references/cold-start-pattern.md`. Never block output on missing state.

```
languages     -> [] (use generic examples)
frameworks    -> [] (use base 6 dimensions only)
testFrameworks -> [] (default to table format)
risks         -> [] (no risk annotations)
coverageGaps  -> [] (standard prioritization)
featureUnderTest -> null (derive from $ARGUMENTS)
skillHistory  -> [] (no prior output awareness)
```

## 2. Stack-Aware Dimension Mapping

Base 6 dimensions always apply: happy path, negative, boundary, edge, security, performance.

Add dimensions when the following stack signals are detected:

| Stack Signal | Additional Dimensions | Detection Check |
|---|---|---|
| React, Vue, Angular | Accessibility, state management, component lifecycle | `detection.frameworks` includes UI framework |
| Express, Fastify, NestJS | API contract, auth/authz, rate limiting | `detection.frameworks` includes server framework |
| Next.js, Nuxt | SSR/SSG, hydration, routing | `detection.frameworks` includes meta-framework |
| Database (Prisma, TypeORM, Sequelize, Mongoose) | Data integrity, migration, concurrent access | `detection.frameworks` includes ORM/DB library |
| Payment (Stripe, PayPal, Adyen) | Transaction safety, idempotency | `detection.frameworks` includes payment library |
| GraphQL (Apollo, urql) | Query complexity, schema validation | `detection.frameworks` includes GraphQL library |
| Mobile (React Native, Flutter) | Offline mode, device permissions | `detection.frameworks` includes mobile framework |

When no frameworks detected (cold start), use only the base 6. Do not guess.

## 3. State Writing Workflow

After skill execution, write a summary to session state. This enables downstream skills to reference prior output.

```bash
# Append to skillHistory (state-manager auto-appends for session append fields)
node scripts/state-manager.js write session skillHistory '{
  "skill": "test-cases",
  "feature": "login",
  "timestamp": "2026-03-06T10:30:00Z",
  "testCaseCount": 12,
  "byPriority": {"P0": 3, "P1": 5, "P2": 3, "P3": 1},
  "riskAreas": ["auth"],
  "testCaseIds": ["TC-LOGIN-01", "TC-LOGIN-02", "TC-LOGIN-03"]
}'

# Merge findings (deduplicates by "area" key)
node scripts/state-manager.js merge session findings '{
  "area": "login",
  "type": "test-cases",
  "summary": "12 test cases generated, 3 P0 targeting auth risk area"
}'
```

**Key distinction:** Use `write` for `skillHistory` and `findings` (session append fields -- state-manager auto-appends). Use `merge` when deduplication by key is needed (e.g., updating an existing finding for the same area).

### Write-Back JSON Shape

skillHistory entry:
```json
{
  "skill": "<skill-name>",
  "feature": "<feature-tested>",
  "timestamp": "<ISO-8601>",
  "testCaseCount": 12,
  "byPriority": {"P0": 3, "P1": 5, "P2": 3, "P3": 1},
  "riskAreas": ["<area1>", "<area2>"],
  "testCaseIds": ["TC-FEATURE-01", "TC-FEATURE-02"]
}
```

findings entry:
```json
{
  "area": "<feature-or-module>",
  "type": "<skill-name>",
  "summary": "<one-line summary of output>"
}
```

## 4. Prior Output Awareness

Check `skillHistory` for prior invocations of the same skill for the same feature. This is soft awareness -- mention it, don't block output.

```
1. Read session skillHistory
2. Filter entries where skill == current skill name
3. If match found for same feature:
   -> Add note: "Note: {count} test cases for {feature} already generated this session (IDs: {ids}). Generating fresh set -- review for overlap."
4. If match found for different feature:
   -> No action needed (different scope)
5. If no match:
   -> No action needed (first invocation)
```

Always generate full output regardless of prior invocations. The user decides whether to merge or skip.
