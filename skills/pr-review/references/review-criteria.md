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
