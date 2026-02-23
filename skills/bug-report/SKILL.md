---
name: bug-report
description: Generate structured bug reports from plain-language descriptions for Jira, GitHub, or Azure DevOps
---

# Bug Report Generator

Transform QA observations into structured bug reports. Read `qa-artifacts/.qa-config.json` for project context and bug tracker preference.

## Input
Accept plain-language descriptions via `$ARGUMENTS`. Examples:
- "The checkout page crashes when I enter a long address"
- "Users can't upload images larger than 2MB, it just shows a spinner forever"
- "The search results show deleted items sometimes"

## Workflow

1. **Parse the observation** — extract what happened, where, and when
2. **Ask clarifying questions** if critical info is missing:
   - What were you doing when this happened?
   - What did you expect to happen?
   - Can you reproduce it consistently?
   - What browser/device/environment?
3. **Generate the bug report** with all fields populated
4. **Classify severity** using these definitions:
   - **Blocker**: Core functionality unusable, no workaround, blocks release
   - **Critical**: Major feature broken, workaround exists but is unacceptable
   - **Major**: Feature partially broken, workaround available
   - **Minor**: Small defect, edge case, minor inconvenience
   - **Cosmetic**: Visual-only issue, no functional impact
5. **Suggest duplicate search terms** to check for existing reports
6. **Format for target platform** — load `references/platform-formats.md` if needed

## Output Structure

```
## [BUG] <Concise title describing the issue>

**Severity**: Blocker / Critical / Major / Minor / Cosmetic
**Priority**: P0 / P1 / P2 / P3
**Component**: <affected area>
**Environment**: <browser, OS, device, app version>

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

## Save
Save to `qa-artifacts/bug-reports/bug-YYYY-MM-DD-<brief>.md`

## Suggested Next Steps
After generating the bug report, suggest:
- "Create test cases to cover this bug scenario and prevent regression with `/qa-toolkit:test-cases`."
