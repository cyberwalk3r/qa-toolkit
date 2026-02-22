# Bug Report Platform Formats

## Jira
Use this format for Jira tickets (paste into description field):

```
h2. Description
{description}

h2. Steps to Reproduce
# {step 1}
# {step 2}
# {step 3}

h2. Expected Result
{expected}

h2. Actual Result
{actual}

h2. Environment
* Browser: {browser}
* OS: {os}
* Version: {version}

h2. Additional Info
{context}
```

Fields to set: Summary, Priority, Component, Affects Version, Labels

---

## GitHub Issues
Use GitHub-flavored markdown directly from the standard output format.
Add labels: `bug`, severity label (e.g., `severity: critical`), component label.

---

## Azure DevOps
Use this format for Azure DevOps bug work items:

```
### Repro Steps
1. {step 1}
2. {step 2}
3. {step 3}

### Expected Result
{expected}

### Actual Result
{actual}

### System Info
- Browser: {browser}
- OS: {os}
```

Map fields: Severity → Azure severity, Priority → Azure priority, Area Path → component

---

## Linear
Use markdown format with labels. Linear supports:
- Priority: Urgent / High / Medium / Low / No Priority
- Labels: Bug, component labels
- Cycles: Current sprint

---

## Generic / Email
Format as a clear, professional email with:
- Subject: [BUG] {title} — {severity}
- Body: Standard markdown format
