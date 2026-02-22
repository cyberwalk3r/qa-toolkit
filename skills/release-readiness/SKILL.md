---
name: release-readiness
description: Go/no-go release assessment with quality gate scoring and risk analysis
---

# Release Readiness Assessment

Generate a go/no-go release decision. Read `qa-artifacts/.qa-config.json` for project context.

## Input
Accept via `$ARGUMENTS`: release type, version, or just start an interactive assessment.

## Workflow

1. **Identify release type**:
   - Hotfix (emergency fix, minimal testing)
   - Patch (bug fixes, targeted testing)
   - Minor (new features, standard testing)
   - Major (breaking changes, full regression)
2. **Gather quality signals** — ask the user about each:
   - Test execution status — how many tests passed/failed/blocked?
   - Known open bugs — any blockers or criticals?
   - New features tested? — against acceptance criteria?
   - Regression testing — completed to what scope?
   - Performance — any degradation noted?
   - Security — any new vulnerabilities?
3. **Score each quality gate** (0-100):
   - Test Coverage Score
   - Bug Status Score (based on open severity)
   - Regression Score
   - Deployment Readiness Score
4. **Generate recommendation**

## Output Structure
```
## Release Readiness Assessment
Version: <version>
Release Type: <type>
Date: YYYY-MM-DD
Assessor: QA Toolkit

### Overall Verdict: GO / NO-GO / CONDITIONAL GO
Confidence: <percentage>

### Quality Gate Scores
| Gate | Score | Status | Details |
|------|-------|--------|---------|
| Test Coverage | xx/100 | ✅/⚠️/❌ | ... |
| Bug Status | xx/100 | ✅/⚠️/❌ | ... |
| Regression | xx/100 | ✅/⚠️/❌ | ... |
| Deployment | xx/100 | ✅/⚠️/❌ | ... |

### Risk Matrix
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|

### Conditions (if Conditional Go)
- [ ] <condition that must be met>

### Post-Release Monitoring Plan
- First 1 hour: <what to monitor>
- First 24 hours: <what to monitor>
- First 72 hours: <what to monitor>

### Rollback Trigger Criteria
- <condition that triggers rollback>
```

For release type templates, read `references/release-types.md`.

## Save
Save to `qa-artifacts/release-assessments/release-YYYY-MM-DD-<version>.md`
