# Artifact Organization Patterns

Shared cross-cutting reference for context-based artifact save path resolution. Skills reference this file to determine where to save output artifacts based on session state.

## Save Path Resolution

Resolve the save path using this priority order. Use the first match.

### Priority 1: Feature Context

Read session state `featureUnderTest` via state-manager.js:

```bash
FEATURE=$(node scripts/state-manager.js read session featureUnderTest)
```

If `featureUnderTest` is set (non-null, non-empty):

```
qa-artifacts/{featureUnderTest}/{artifact-type}/{filename}
```

Example: `qa-artifacts/login/test-cases/tc-2026-03-06-login.md`

The feature name is used as-is from state (lowercase, hyphenated by convention).

### Priority 2: Sprint/Iteration Context

If the user provides a sprint or iteration identifier in the skill arguments (e.g., `--sprint sprint-23`):

```
qa-artifacts/{sprint-id}/{artifact-type}/{filename}
```

Example: `qa-artifacts/sprint-23/bug-reports/bug-2026-03-06-crash.md`

### Priority 3: Flat Fallback (Default)

If no feature or sprint context is available:

```
qa-artifacts/{artifact-type}/{filename}
```

Example: `qa-artifacts/test-cases/tc-2026-03-06-login.md`

This is the current flat structure. No migration is forced -- the organized pattern is purely additive.

## Artifact Type Directories

Each skill saves to a specific artifact-type directory:

| Skill | Artifact Type Directory | File Prefix | Extension |
|-------|------------------------|-------------|-----------|
| test-cases | `test-cases` | `tc-` | `.md` |
| e2e-test | `e2e-tests` | `e2e-` | `.spec.{ts\|js}` |
| bug-report | `bug-reports` | `bug-` | `.md` |
| test-plan | `test-plans` | `test-plan-` | `.md` |
| pr-review | `pr-reviews` | `pr-review-` | `.md` |
| coverage-gap | `coverage-analysis` | `coverage-gap-` | `.md` |
| risk-prioritization | `risk-analysis` | `risk-priority-` | `.md` |
| flaky-test-diagnosis | `flaky-diagnosis` | `flaky-diagnosis-` | `.md` |
| test-data | `test-data` | `data-` | `.{json\|csv\|sql}` |
| api-test | `api-tests` | `api-test-` | `.md` |
| exploratory-testing | `exploratory` | `session-` | `.md` |
| accessibility | `a11y-audits` | `a11y-` | `.md` |
| regression-planner | `regression-plans` | `regression-` | `.md` |
| release-readiness | `release-assessments` | `release-` | `.md` |

## Filename Convention

All artifacts follow: `{prefix}YYYY-MM-DD-{slug}.{ext}`

- Date is ISO format (year-month-day)
- Slug is derived from the feature name, endpoint, or brief description
- Lowercase, hyphen-separated, no spaces or special characters

## Directory Creation

Always create directories lazily using the equivalent of `mkdir -p`. Never pre-create empty directory structures.

```bash
mkdir -p "qa-artifacts/login/test-cases"
```

Skills should create the directory immediately before writing the file, not during initialization.

## Backward Compatibility

Existing flat artifact directories (`qa-artifacts/test-cases/`, `qa-artifacts/bug-reports/`, etc.) remain valid and are not migrated. The context-based organization is additive:

- Old artifacts stay where they are
- New artifacts use context-based paths when context is available
- The `session-hook.js` Stop hook scans recursively, detecting artifacts in both flat and context-prefixed structures
- No cleanup or migration scripts are needed

## Integration with State Manager

The `featureUnderTest` field is the primary context source. It is set by skills that accept a feature argument and persists across the session.

```bash
# Reading feature context for save path
FEATURE=$(node scripts/state-manager.js read session featureUnderTest)

# A skill setting feature context
node scripts/state-manager.js write session featureUnderTest '"login"'
```

When a skill writes `featureUnderTest`, subsequent skills in the same session automatically inherit the context for their save paths.
