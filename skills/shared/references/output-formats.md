# Output Format Templates

Shared cross-cutting reference for multi-platform output formatting. All artifact-producing skills reference this file to support platform-specific output when requested.

## Format Selection

The user specifies output format via `--format` argument. Default is **Markdown** (no transformation needed).

Supported values: `markdown` (default), `jira`, `github`, `ado`, `testrail`

**Applicability by skill type:**

| Category | Skills | Format Treatment |
|----------|--------|-----------------|
| Structured reports | bug-report, test-plan, coverage-gap, risk-prioritization, pr-review, flaky-test-diagnosis | Full platform template -- headers, tables, field mappings all transform |
| Code/scaffold output | e2e-test, api-test, test-data | Format applies to accompanying documentation headers only, not generated code |
| Table/list output | test-cases | Table syntax transforms (Jira wiki tables vs markdown tables) |

## Graceful Degradation

When a QA Toolkit field has no equivalent in the target platform, **omit it**. Never insert placeholder values like "N/A", "TBD", or empty fields. The output should contain only meaningful data.

If an entire section has no mappable fields for a platform, omit that section with no comment.

---

## Markdown (Default)

No transformation needed. Use standard markdown with:
- `##` headers for sections
- `|` pipe tables with alignment
- Triple-backtick fenced code blocks with language tags
- `- [ ]` checkbox task lists

This is the baseline format that all skills produce natively.

---

## Jira Wiki Markup

### Syntax Reference

| Element | Jira Syntax | Markdown Equivalent |
|---------|-------------|---------------------|
| H1 | `h1. Title` | `# Title` |
| H2 | `h2. Title` | `## Title` |
| H3 | `h3. Title` | `### Title` |
| Bold | `*text*` | `**text**` |
| Italic | `_text_` | `*text*` |
| Ordered list | `# Item` | `1. Item` |
| Unordered list | `* Item` | `- Item` |
| Code block | `{code:java}...{code}` | `` ```java...``` `` |
| Inline code | `{{code}}` | `` `code` `` |
| Table header | `\|\| H1 \|\| H2 \|\|` | `\| H1 \| H2 \|` + separator |
| Table row | `\| C1 \| C2 \|` | `\| C1 \| C2 \|` |
| Link | `[label\|url]` | `[label](url)` |

### Field Mapping

| QA Toolkit Field | Jira Field | Notes |
|------------------|------------|-------|
| Title / Name | Summary | Required, keep under 255 chars |
| Priority P0 | Highest | |
| Priority P1 | High | |
| Priority P2 | Medium | |
| Priority P3 | Low | |
| Feature / Component | Component | Select from project components |
| Risk Area | Labels | Prefix: `risk:{area}` |
| Severity | Custom field or Labels | Depends on project Jira config |
| Test Case ID | Labels or custom field | Format: `tc:{id}` |
| Environment | Environment field | Browser, OS, version |

### When Field Not Available

Omit the Jira field entirely. Do not create empty custom fields.

### Example: Test Case in Jira Format

```
h2. TC-LOGIN-01: Valid credentials login

|| Priority || Type || Dimension ||
| Highest | Positive | Happy Path |

h3. Preconditions
# User account exists with verified email
# User is on the login page

h3. Steps
# Enter valid email in the email field
# Enter correct password in the password field
# Click the "Sign In" button

h3. Expected Result
User is redirected to the dashboard with a valid session token.

h3. Risk Notes
*Auth module flagged as risk area* -- 3 recent defects in authentication flow.
```

---

## GitHub Issues (GFM)

### Syntax Reference

Standard GitHub-Flavored Markdown with these additions:
- Task lists: `- [ ] item` / `- [x] item`
- Auto-linked references: `#123` for issues, `@user` for mentions
- Alerts: `> [!NOTE]`, `> [!WARNING]`, `> [!IMPORTANT]`
- Collapsed sections: `<details><summary>Title</summary>content</details>`

### Field Mapping

| QA Toolkit Field | GitHub Field | Notes |
|------------------|-------------|-------|
| Title / Name | Issue title | Keep concise, under 100 chars |
| Priority P0 | Label: `priority:critical` | |
| Priority P1 | Label: `priority:high` | |
| Priority P2 | Label: `priority:medium` | |
| Priority P3 | Label: `priority:low` | |
| Severity | Label: `severity:{level}` | e.g., `severity:critical` |
| Feature / Component | Label: `component:{name}` | e.g., `component:auth` |
| Artifact type | Label: `bug` / `test` / `enhancement` | Match issue type |
| Risk Area | Label: `risk:{area}` | |
| Environment | Body section | Use a "Environment" heading |
| Assignee | Assignee field | If known |

### Labels Convention

Apply multiple labels per issue:
- Type: `bug`, `test-case`, `test-plan`, `risk`, `coverage-gap`
- Severity: `severity:critical`, `severity:major`, `severity:minor`, `severity:trivial`
- Component: `component:{name}`
- Priority: `priority:critical`, `priority:high`, `priority:medium`, `priority:low`

### When Field Not Available

GitHub Issues supports all markdown fields natively. For structured metadata not expressible in markdown, use labels.

### Example: Bug Report in GitHub Format

```markdown
## Description

Login fails silently when password contains unicode characters.

## Steps to Reproduce

1. Navigate to `/login`
2. Enter email: `test@example.com`
3. Enter password containing unicode: `p@ss\u00e9`
4. Click "Sign In"

## Expected Result

User is authenticated and redirected to dashboard.

## Actual Result

Form submits but page reloads with no error message. No network error in console.

## Environment

- Browser: Chrome 120
- OS: macOS 14.2

> [!IMPORTANT]
> Auth module is a known risk area with 3 recent defects.

**Labels:** `bug`, `severity:major`, `component:auth`, `priority:high`
```

---

## Azure DevOps Work Items

### Syntax Reference

ADO supports a subset of HTML within markdown fields:
- Standard markdown headers, lists, tables work
- HTML tags for richer formatting: `<table>`, `<br>`, `<b>`
- `@mention` for user references
- `#123` for work item linking

ADO bug work items have dedicated fields: Repro Steps, System Info, Acceptance Criteria.

### Field Mapping

| QA Toolkit Field | ADO Field | Notes |
|------------------|-----------|-------|
| Title / Name | Title | Required |
| Priority P0 | Severity: 1 - Critical | |
| Priority P1 | Severity: 2 - High | |
| Priority P2 | Severity: 3 - Medium | |
| Priority P3 | Severity: 4 - Low | |
| Feature / Component | Area Path | e.g., `Project\Auth\Login` |
| Sprint / Iteration | Iteration Path | e.g., `Project\Sprint 23` |
| Steps to Reproduce | Repro Steps field | HTML-in-markdown supported |
| Environment | System Info field | Dedicated field on Bug work items |
| Risk Area | Tags | Comma-separated |
| Test Case Steps | Test Case work item Steps field | Numbered action/expected pairs |

### When Field Not Available

Omit the field. ADO silently ignores empty optional fields.

### Example: Bug Report in ADO Format

```html
<b>Repro Steps:</b>
<ol>
<li>Navigate to /login</li>
<li>Enter email: test@example.com</li>
<li>Enter password containing unicode characters</li>
<li>Click "Sign In"</li>
</ol>

<b>Expected Result:</b>
User is authenticated and redirected to dashboard.

<b>Actual Result:</b>
Form submits but page reloads silently. No error message displayed.

<b>System Info:</b>
<ul>
<li>Browser: Chrome 120</li>
<li>OS: macOS 14.2</li>
</ul>
```

**Tags:** `risk:auth`, `regression`
**Severity:** 2 - High
**Area Path:** Project\Auth\Login

---

## TestRail

### Syntax Reference

TestRail uses CSV for bulk import. Each row represents one test case. Custom fields require admin configuration before import.

Standard columns (order matters for import):

```
Title,Section,Type,Priority,Estimate,Preconditions,Steps,Expected Result
```

For multi-step test cases, Steps and Expected Result use line breaks within the CSV cell (enclosed in double quotes).

### Field Mapping

| QA Toolkit Field | TestRail Column | Notes |
|------------------|----------------|-------|
| Title / Name | Title | Required |
| Test Case ID | (not imported -- TestRail assigns) | Reference in Title prefix |
| Priority P0 | Priority: Critical | |
| Priority P1 | Priority: High | |
| Priority P2 | Priority: Medium | |
| Priority P3 | Priority: Low | |
| Feature / Component | Section | Maps to test suite section hierarchy |
| Test Type | Type | Functional, Regression, Smoke, etc. |
| Time Estimate | Estimate | Format: `1m`, `5m`, `30m`, `1h` |
| Preconditions | Preconditions | Multi-line within quotes |
| Steps | Steps | Numbered, line-break separated within quotes |
| Expected Result | Expected Result | Paired with final step or summary |

### When Field Not Available

Omit the column value (empty cell in CSV). TestRail treats empty cells as blank fields.

Custom fields (risk area, coverage dimension, etc.) require TestRail admin to configure before they appear in import. Document custom field needs in a comment row.

### Example: Test Cases in TestRail CSV Format

```csv
Title,Section,Type,Priority,Estimate,Preconditions,Steps,Expected Result
"TC-LOGIN-01: Valid credentials login",Login,Functional,Critical,5m,"User account exists with verified email
User is on login page","1. Enter valid email
2. Enter correct password
3. Click Sign In","User redirected to dashboard with valid session"
"TC-LOGIN-02: Invalid password",Login,Negative,High,3m,"User account exists
User is on login page","1. Enter valid email
2. Enter incorrect password
3. Click Sign In","Error message displayed: Invalid credentials"
"TC-LOGIN-03: Empty email field",Login,Boundary,Medium,2m,"User is on login page","1. Leave email field empty
2. Enter any password
3. Click Sign In","Validation error shown on email field"
```
