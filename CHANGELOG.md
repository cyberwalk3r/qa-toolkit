# Changelog

## [1.1.0] — 2026-02-23

### Fixed
- Replace invalid `TaskCompleted` hook event with `Stop` — activity logging now works
- Remove dead code: unused `detectors.frameworks` and `detectors.testFrameworks` arrays
- Stop eagerly creating 9 empty artifact subdirectories on session start
- Parse pyproject.toml dependencies by TOML section instead of regex-matching all quoted strings
- Recursive glob matching (depth 3) for .csproj/.sln detection in subdirectories
- Validate `--browser` argument in run-test.js against chromium/firefox/webkit
- Shell injection prevention: replaced `execSync` with `execFileSync` in run-test.js
- Scoped permissions: removed broad `Bash(node:*)` and `Bash(gh api:*)` from settings
- Validate `outputDir` against path traversal (`../` and absolute paths) in both hook scripts

### Added
- Monorepo detection: scans immediate subdirectories for language markers, dependency files, test frameworks, lock files, and test directories
- Configurable output directory via `settings.json` `outputDir` field
- `hooksEnabled` toggle to disable hooks without removing the plugin
- 27 automated tests using Node.js built-in test runner (zero dependencies)
- GitHub Actions CI workflow running tests on Node 18/20/22
- `.qa-config.json` schema documentation in README
- `.gitignore` suggestion step in setup skill workflow
- "Permissions & Side Effects" section in README with `Bash(git:*)` mechanism explained
- Contextual "Suggested Next Steps" cross-references in all skills
- CLAUDE.md with plugin development conventions
- "Agents vs Skills" section in README clarifying when to use each

## [1.0.0] — 2026-02-22

### Added
- 10 QA skills: setup, pr-review, bug-report, test-cases, api-test, regression-planner, test-data, accessibility, release-readiness, e2e-test
- 3 QA agents: qa-reviewer, qa-explorer, qa-lead
- SessionStart hook for automatic project detection (18 languages, 12 frameworks, CI/CD, existing docs)
- Stop hook for activity logging
- Artifact persistence in `qa-artifacts/` directory
- Reference files for stack-specific risk patterns, WCAG 2.1 checklists, BDD patterns, API test patterns, and more
