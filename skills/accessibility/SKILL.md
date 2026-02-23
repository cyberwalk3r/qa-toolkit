---
name: accessibility
description: Guided WCAG 2.1 accessibility audit with plain-English manual test scripts
---

# Accessibility Checker

Guided accessibility audit against WCAG 2.1. Read `qa-artifacts/.qa-config.json` for project context.

## Input
Accept via `$ARGUMENTS`: page URL, feature name, or component description.

## Workflow

1. **Select audit scope**: full page, specific component, or entire user flow
2. **Run guided audit** across WCAG categories:
   - **Perceivable**: images have alt text, color contrast, text alternatives
   - **Operable**: keyboard navigation, focus management, timing
   - **Understandable**: labels, error messages, predictable behavior
   - **Robust**: semantic HTML, ARIA usage, screen reader compatibility
3. **Generate manual test scripts** in plain English
4. **Recommend automated tools** for the detected tech stack
5. **Produce audit report**

## Manual Test Scripts
Generate step-by-step instructions anyone can follow:
```
1. TAB through the page from top to bottom
   ✅ PASS if: every interactive element receives visible focus
   ❌ FAIL if: focus disappears, skips elements, or has no visible indicator

2. With a screen reader (NVDA/VoiceOver), navigate the page
   ✅ PASS if: all content is announced in logical order
   ❌ FAIL if: images are skipped, buttons are unlabeled, or content is repeated
```

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
<numbered plain-language test steps>

### Recommended Tools
<based on project tech stack>
```

For full WCAG checklist, read `references/wcag-checklist.md`.
For manual test procedures, read `references/manual-tests.md`.

## Save
Save to `qa-artifacts/a11y-audits/a11y-YYYY-MM-DD-<page>.md`

## Suggested Next Steps
After generating the audit, suggest:
- "File each critical/major finding as a bug report with `/qa-toolkit:bug-report`."
