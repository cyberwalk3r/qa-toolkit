# QA Toolkit Plugin Improvements Design

Date: 2026-02-23

## Summary

Fix 10 identified weaknesses in the qa-toolkit v1.0.0 plugin: 2 critical bugs, 4 significant issues, and 4 design gaps.

## Fixes

### 1. Hook event: TaskCompleted → Stop (Critical)

`TaskCompleted` is not a valid Claude Code hook event. Change `hooks.json` to use `Stop`. No changes to `save-artifact.js` logic.

### 2. Remove dead code in detect-project.js (Critical)

Delete unused `detectors.frameworks` (lines 53-66) and `detectors.testFrameworks` (lines 67-86) arrays. Actual detection uses `frameworkChecks` and `testChecks` arrays.

### 3. Lazy directory creation (Significant)

Stop creating 9 empty subdirectories on SessionStart. Only create `qa-artifacts/` root for the config file. Each skill creates its subdirectory on first artifact save.

### 4. Fix pyproject.toml parsing (Significant)

Replace crude regex with section-aware parsing. Only extract dependency names from `[project.dependencies]`, `[project.optional-dependencies]`, and `[tool.poetry.dependencies]` sections.

### 5. Recursive glob for .csproj/.sln (Significant)

Replace root-only `readdirSync` with recursive walk (depth limit 3) to catch `.csproj` files in subdirectories.

### 6. Validate browser arg in run-test.js (Significant)

Whitelist check against `['chromium', 'firefox', 'webkit']`. Exit with clear error if invalid.

### 7. Skill cross-referencing (Design)

Add conditional "Suggested Next Steps" section to each skill's output template:
- pr-review → regression-planner (if risk Medium+), test-cases
- bug-report → test-cases
- test-cases → test-data, e2e-test
- api-test → test-data
- e2e-test → accessibility
- regression-planner → release-readiness
- accessibility → bug-report
- release-readiness → regression-planner (if score low)
- setup → pr-review, test-cases

### 8. Add CLAUDE.md (Design)

Create repo-level CLAUDE.md covering plugin structure, conventions, testing instructions.

### 9. Configurable output directory (Design)

Add `"outputDir": "qa-artifacts"` to `settings.json`. Scripts read this setting. Skills reference configured directory from `.qa-config.json`.

### 10. Clarify agent/skill boundary (Design)

Update agent descriptions: conversational, multi-turn QA work. Update skill descriptions: one-shot structured output. Add "Agents vs Skills" section to README.
