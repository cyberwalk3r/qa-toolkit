---
name: bug-report
description: Transform any bug observation into a structured, tracker-ready bug report with auto-filled environment, severity classification, and duplicate search terms. Use this skill whenever a user describes something broken, unexpected behavior, a crash, an error message, or says things like "it doesn't work", "I found a bug", or "something's wrong with X" — even a single sentence produces a complete, ready-to-file report.
---

# Bug Report Generator

Transform QA observations into structured bug reports. Reads project and session state to auto-fill environment details, pre-fill component from session context, and boost severity for known risk areas.

## Input

Accept plain-language descriptions via `$ARGUMENTS`. Examples:
- "The checkout page crashes when I enter a long address"
- "Users can't upload images larger than 2MB, it just shows a spinner forever"
- "The search results show deleted items sometimes"

Optional flags in `$ARGUMENTS`:
- `--platform jira|github|ado|linear` -- select target format (loads `references/platform-formats.md`)

## Workflow

### Step 1: Read State

Read `shared/references/state-integration.md` for the full state reading pattern.

Execute state reading commands:

```bash
PROJECT_STATE=$(node scripts/state-manager.js read project)
SESSION_STATE=$(node scripts/state-manager.js read session)
DETECTION=$(node scripts/state-manager.js read project detection)
RISKS=$(node scripts/state-manager.js read project risks)
FEATURE=$(node scripts/state-manager.js read session featureUnderTest)
SKILL_HISTORY=$(node scripts/state-manager.js read session skillHistory)
```

Extract from project state:
- `detection.languages`, `detection.frameworks`, `detection.testFrameworks`, `detection.packageManager`, `detection.monorepo` -- for environment auto-fill
- `risks[]` -- for severity boost

Extract from session state:
- `featureUnderTest` -- for component pre-fill
- `skillHistory[]` -- for prior output awareness
- `findings[]` -- for cross-reference

If no state available (cold start), use defaults per `shared/references/cold-start-pattern.md`. Every conditional below has a fallback.

Load `shared/references/output-formats.md` for multi-platform format support.
Load `shared/references/artifact-organization.md` for context-based save paths.

### Step 2: Parse Observation

From `$ARGUMENTS`, extract: what happened, where, when, frequency.

If critical info is missing, ask clarifying questions:
- What were you doing when this happened?
- What did you expect to happen?
- Can you reproduce it consistently?
- What browser/device/environment?

### Step 3: Check Prior Output

Check session `skillHistory` for prior `bug-report` invocations:

- If prior bug-report found for **same component**: add note at top of output: "Note: A bug report for {component} was generated earlier this session. Generating fresh report -- review for duplicates."
- Also check `findings[]` for any prior findings mentioning the same area.

Always generate full output regardless of prior invocations.

### Step 4: Auto-Fill and Classify

**Environment auto-fill from project state:**

```
detection.languages      -> "Languages: TypeScript, Python"
detection.frameworks     -> "Frameworks: React 18, Express 4"
detection.testFrameworks -> "Test Frameworks: Playwright, Jest"
detection.packageManager -> "Package Manager: pnpm"
detection.monorepo       -> "Monorepo: Nx (3 packages)"
```

Cold-start: all environment fields -> "[Not detected -- fill manually]"

**Component pre-fill:** If session `featureUnderTest` is set, default component to it with note "(pre-filled from session: testing {feature})". User can override.

**Severity classification** using these definitions:
- **Blocker**: Core functionality unusable, no workaround, blocks release
- **Critical**: Major feature broken, workaround exists but is unacceptable
- **Major**: Feature partially broken, workaround available
- **Minor**: Small defect, edge case, minor inconvenience
- **Cosmetic**: Visual-only issue, no functional impact

**Severity boost:** If the affected component matches a known risk area from project state `risks[]`, add a severity boost suggestion: "Severity boost suggested: {component} is a known risk area with {count} prior issues."

**Duplicate search terms:** Enhance with project-specific terminology from state (framework names, detected module names, component area).

### Step 5: Generate Bug Report

Use the output structure below. Format for target platform by loading `references/platform-formats.md` if `--platform` flag is specified.

### Step 6: Format with Context Preamble

Read `shared/references/context-preamble.md` and generate the context preamble. The "Why" line for bug-report:

```
> **Why this format:** Environment pre-filled from detected stack ({languages}, {frameworks}).
> Component defaulted to {featureUnderTest} from session context.
> Severity informed by known risk area: {area} ({count} prior issues).
```

### Step 7: Write Session State

After generating output, write execution summary to session state:

```bash
node scripts/state-manager.js write session skillHistory '{
  "skill": "bug-report",
  "feature": "<component>",
  "timestamp": "<ISO-8601>",
  "bugTitle": "<concise title>",
  "severity": "blocker|critical|major|minor|cosmetic",
  "component": "<affected component>",
  "reproductionStatus": "always|intermittent|once|unknown"
}'

node scripts/state-manager.js merge session findings '{
  "area": "<component>",
  "type": "bug-report",
  "summary": "<severity> bug in <component>: <title>"
}'
```

## Output Structure

```
## [BUG] <Concise title describing the issue>

**Severity**: Blocker / Critical / Major / Minor / Cosmetic
**Priority**: P0 / P1 / P2 / P3
**Component**: <affected area>
**Environment**: <auto-filled from project state>

### Description
<1-2 sentence clear description>

### Steps to Reproduce
1. <step>
2. <step>
3. <step>

### Expected Result
<what should happen>

### Actual Result
<what actually happens>

### Additional Context
- Frequency: Always / Intermittent / Once
- Screenshots/logs: <if provided>
- Related issues: <if known>

### Suggested Search Terms for Duplicates
- <term 1>
- <term 2>
```

## Output Section Order

1. **Context preamble** -- blockquote with project context, "Why this format", per `shared/references/context-preamble.md`
2. **Prior output note** -- if applicable (Step 3)
3. **Bug report body** -- all sections above with environment auto-fill, component pre-fill, severity boost annotation
4. **Cold-start footer** -- if applicable, per `shared/references/cold-start-pattern.md`
5. **Suggested Next Steps**

## Save

Save to `qa-artifacts/bug-reports/bug-YYYY-MM-DD-<brief>.md`

Apply format from `--format` argument (default: markdown). See `shared/references/output-formats.md`.
Use context-based save path per `shared/references/artifact-organization.md`.

## Suggested Next Steps

After generating the bug report, suggest based on context:
- "Create test cases to cover this bug scenario and prevent regression with `/qa-toolkit:test-cases`." If findings were written: "(Bug severity and component will inform test prioritization.)"
- If severity is Critical or Blocker: "Map the impact radius of this bug with `/qa-toolkit:regression-planner`."
