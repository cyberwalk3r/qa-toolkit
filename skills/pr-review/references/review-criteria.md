# Review Criteria by Change Type

## Feature Addition
- Does it match the requirements/spec?
- Are all acceptance criteria verifiable?
- Is there adequate test coverage for the new feature?
- Does it handle edge cases (empty state, max values, error state)?
- Is the feature behind a feature flag if needed?
- Does it degrade gracefully on unsupported browsers/devices?

## Bug Fix
- Does the fix actually address the root cause?
- Is there a test that would have caught this bug?
- Could the fix introduce regressions in related areas?
- Are there similar patterns elsewhere that might have the same bug?

## Refactor
- Does the behavior remain identical before and after?
- Are existing tests still passing without modification?
- Is the refactor improving maintainability without changing functionality?

## Dependency Update
- Is the dependency update a major/minor/patch version?
- Are there breaking changes in the changelog?
- Has the dependency been tested with the current codebase?
- Are there known security vulnerabilities being addressed?

## Database Migration
- Is the migration reversible?
- Does it handle existing data correctly?
- Is there a data backfill needed?
- What happens during deployment (downtime, concurrent access)?
- Has the migration been tested with production-scale data?

## Configuration Change
- Are environment-specific values handled correctly?
- Are secrets/credentials managed securely?
- Is there a rollback path?
- Are all environments (dev/staging/prod) accounted for?

---

## State-Context-Informed Criteria

When project state is available, add these conditional criteria per change type:

### Per-Change-Type State Conditions

| Change Type | State Condition | Additional Criteria |
|---|---|---|
| Feature Addition | `risks[]` includes touched areas | "This change touches a known risk area ({area}) -- verify feature-specific mitigations are in place (error handling, rollback, feature flags)." |
| Feature Addition | `coverageGaps[]` includes touched areas | "This area has known coverage gaps -- recommend additional test coverage in the review." |
| Bug Fix | `risks[]` includes touched areas | "This change touches a known risk area ({area}) -- verify the fix does not weaken existing safeguards. Check for similar patterns in related risk areas." |
| Bug Fix | `coverageGaps[]` includes touched areas | "This area has known coverage gaps -- recommend a regression test that covers this fix." |
| Refactor | `risks[]` includes touched areas | "This change touches a known risk area ({area}) -- verify behavior equivalence with extra scrutiny. Refactors in risk areas need explicit before/after verification." |
| Refactor | `coverageGaps[]` includes touched areas | "This area has known coverage gaps -- ensure existing tests cover the refactored paths before approving." |
| Dependency Update | `risks[]` includes touched areas | "This dependency is used in a known risk area ({area}) -- verify the update does not change behavior in risk-sensitive code paths." |
| Database Migration | `risks[]` includes touched areas | "This migration affects a known risk area ({area}) -- verify data integrity with production-scale test data and confirm rollback works." |
| Database Migration | `coverageGaps[]` includes touched areas | "This area has known coverage gaps -- recommend migration-specific test cases before deployment." |
| Configuration Change | `risks[]` includes touched areas | "This config change affects a known risk area ({area}) -- verify all environment variants (dev/staging/prod) for this area." |

### State Context Section

Include this section in pr-review output after Change Classification when state is available:

```markdown
### State Context
> Review informed by: {languages} project using {frameworks}.
> Known risks checked: {risk_count} areas ({risk_names}).
> Coverage gaps checked: {gap_count} areas ({gap_names}).
> Session context: {featureUnderTest or "no active feature"}.
```

### Cold-Start Behavior

When no state is available, omit the State Context section entirely. Do not show empty or placeholder fields.
