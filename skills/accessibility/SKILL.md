---
name: accessibility
description: WCAG 2.1 accessibility audit with plain-English manual test scripts and stack-matched automated tool recommendations. Use this skill whenever a user wants to audit accessibility, asks "is this accessible?", needs an a11y audit of a page or component, or wants to check WCAG compliance before a release.
---

# Accessibility Checker

Conduct a WCAG 2.1 Level AA accessibility audit. Reads project and session state to tailor automated tool recommendations to the detected stack and surface prior audit history. Generates manual test scripts anyone can follow, categorized findings, and actionable recommendations.

## Input
Accept via `$ARGUMENTS`: page URL, feature name, component description, or user flow.

## Workflow

### Step 1: Read State

Execute state reading commands:

```bash
PROJECT_STATE=$(node scripts/state-manager.js read project)
SESSION_STATE=$(node scripts/state-manager.js read session)
DETECTION=$(node scripts/state-manager.js read project detection)
SKILL_HISTORY=$(node scripts/state-manager.js read session skillHistory)
FEATURE=$(node scripts/state-manager.js read session featureUnderTest)
```

Extract from project state:
- `detection.languages`, `detection.frameworks` — for automated tool recommendations (axe-playwright for Playwright, jest-axe for Jest, etc.)
- `detection.testFrameworks` — for recommending runnable accessibility assertions

Extract from session state:
- `featureUnderTest` — for scope context if not specified in `$ARGUMENTS`
- `skillHistory[]` — check for prior accessibility runs on the same area

If no state available, proceed with general tool recommendations and standard WCAG audit.

### Step 2: Parse Input and Determine Scope

From `$ARGUMENTS`, identify:
- **Audit target** — page, component, feature area, or user flow
- **Scope** — full page, specific component, or entire user flow

Derive save label (normalize: lowercase, hyphens only).

### Step 3: Check Prior Output

Check session `skillHistory` for prior `accessibility` invocations:
- If prior found for same target: add note: "Note: An accessibility audit for {target} was already run this session. Generating fresh audit — compare findings for resolution tracking."

### Step 4: Run Guided Audit

Audit across all four WCAG POUR principles. For each finding, record: WCAG criterion, severity, location, and recommendation.

**Perceivable**
- Images: alt text present and descriptive (not filename-only or empty for non-decorative images)
- Color: text meets 4.5:1 contrast ratio (3:1 for large text)
- Text alternatives: non-text content has text equivalents
- Audio/video: captions and transcripts where applicable

**Operable**
- Keyboard: all functionality reachable and operable without a mouse
- Focus: visible focus indicator on all interactive elements; no keyboard traps
- Skip links: skip navigation present for repetitive content
- Timing: no time limits that cannot be extended; animations can be paused

**Understandable**
- Labels: all form fields have associated labels
- Error messages: validation errors identify the field and explain how to fix
- Instructions: complex interactions have clear instructions
- Predictable: pages behave consistently; no unexpected context changes on focus

**Robust**
- Semantic HTML: headings, landmarks, lists used correctly
- ARIA: roles/states/properties used correctly; no redundant or conflicting ARIA
- Screen reader: content announced in logical order; dynamic updates announced

For full WCAG criterion details and testing notes, read `references/wcag-checklist.md`.

### Step 5: Generate Manual Test Scripts

Produce numbered step-by-step instructions a non-developer can follow. For each test, include a clear pass/fail condition.

```
1. TAB through the page from top to bottom
   ✅ PASS if: every interactive element receives visible focus
   ❌ FAIL if: focus disappears, skips elements, or has no visible indicator

2. With a screen reader (NVDA/VoiceOver), navigate the page
   ✅ PASS if: all content announced in logical order, buttons have descriptive labels
   ❌ FAIL if: images skipped, buttons unlabeled, or content repeated
```

For detailed manual test procedures per WCAG criterion, read `references/manual-tests.md`.

### Step 6: Recommend Automated Tools

Based on detected stack:
- **Playwright detected**: `@axe-core/playwright` or `axe-playwright` — runnable in existing test suite
- **Jest detected**: `jest-axe` — axe-core assertions in unit/component tests
- **React/Next.js detected**: `@axe-core/react` for development-time feedback
- **No framework detected**: Browser extension `axe DevTools`, `WAVE`, or Lighthouse (built into Chrome DevTools)

### Step 7: Format with Context Preamble

Generate context preamble:

```markdown
> **Project Context**
> Stack: {languages} | Frameworks: {frameworks} | Test Framework: {testFrameworks}
>
> **Why this audit:** {framework}-specific tool recommendations included.
> Prior audits this session: {N or 'none'}.
```

Cold start: `Stack: Not detected — general tool recommendations provided.`

### Step 8: Write Session State

```bash
node scripts/state-manager.js write session skillHistory '{
  "skill": "accessibility",
  "feature": "<audit-target>",
  "timestamp": "<ISO-8601>",
  "auditTarget": "<page-or-component>",
  "criticalCount": <n>,
  "majorCount": <n>,
  "minorCount": <n>,
  "wcagLevel": "AA"
}'

node scripts/state-manager.js merge session findings '{
  "area": "<audit-target>",
  "type": "accessibility",
  "summary": "A11y audit: <critical> critical, <major> major, <minor> minor issues against WCAG 2.1 AA"
}'
```

## Output Section Order

1. **Context preamble** — blockquote with project context
2. **Prior output note** — if applicable (Step 3)
3. **Audit findings table** — categorized by POUR principle with severity
4. **Manual Test Scripts** — numbered plain-English steps with pass/fail criteria
5. **Recommended Automated Tools** — stack-matched
6. **Suggested Next Steps**

## Output Structure

```
## Accessibility Audit: <page/feature>
Date: YYYY-MM-DD
Standard: WCAG 2.1 Level AA

### Summary
- Critical Issues: <count>
- Major Issues: <count>
- Minor Issues: <count>

### Findings
| # | Issue | WCAG Criterion | Severity | Location | Recommendation |
|---|-------|---------------|----------|----------|----------------|

### Manual Test Scripts
<numbered plain-language test steps with pass/fail criteria>

### Recommended Automated Tools
<based on detected stack>
```

## Save
Save to `qa-artifacts/a11y-audits/a11y-YYYY-MM-DD-<target>.md`

## Suggested Next Steps
After generating the audit:
- "File each Critical/Major finding as a bug report with `/qa-toolkit:bug-report`."
- If E2E framework detected: "Add automated axe assertions to your Playwright tests with `/qa-toolkit:e2e-test`."
