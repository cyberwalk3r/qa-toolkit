# Context Preamble Template

Every skill output begins with a context preamble: a blockquote showing what project state informed the output, why these specific results were generated, and a coverage summary.

## 1. Full Context Preamble

When project state is available (detection populated, risks/gaps present):

```markdown
> **Project Context**
> Stack: {languages} | Frameworks: {frameworks} | Test Framework: {testFrameworks}
> Known Risks: {risk1.area} ({risk1.count} occurrences), {risk2.area} ({risk2.count} occurrences)
> Coverage Gaps: {gap1.area}, {gap2.area}
> Session: Testing {featureUnderTest} | Prior: {priorSkillSummary}
>
> **Why these tests:** {explanation derived from state signals}
```

### "Why These Tests" Derivation Logic

Build the explanation from the intersection of stack signals and risk areas:

1. If stack-aware dimensions were added: "{framework} detected -- includes {added dimensions} dimensions"
2. If risk areas overlap with feature: "{risk area} flagged as risk area -- P0 tests prioritized for {area} flows"
3. If coverage gaps overlap: "{gap area} identified as coverage gap -- additional {dimension} cases included"
4. If no special signals: "Standard coverage across {N} dimensions based on requirement analysis"

Example:
> **Why these tests:** React app with Playwright detected -- includes accessibility and state management dimensions. Auth module flagged as risk area (3 bugs) -- P0 tests prioritized for auth flows. Error handling identified as coverage gap -- additional negative cases included.

### Session Line

- If `featureUnderTest` is set: "Testing {feature}"
- If `skillHistory` has entries: "Prior: {last skill} generated {count} cases for {feature}"
- If both empty: omit the Session line entirely

## 2. Cold-Start Preamble

When no project context is available (`.qa-context.json` missing or `detection.languages` empty):

```markdown
> **Project Context**
> Stack: Not detected | Test Framework: Not detected
>
> **Why these tests:** Standard coverage across 6 base dimensions. Run `/qa-setup` or start a new session for stack-tailored output.
```

Do not guess the stack. Do not invent risks or gaps. Keep it minimal and honest.

## 3. Coverage Summary Format

Append after the test cases (not in the preamble blockquote) as a summary section:

```markdown
### Coverage Summary

**By Priority:** P0: {n} | P1: {n} | P2: {n} | P3: {n} | Total: {total}

**By Dimension:**
| Dimension | Count | Notes |
|---|---|---|
| Happy Path | {n} | |
| Negative | {n} | |
| Boundary | {n} | |
| Edge Cases | {n} | |
| Security | {n} | {if risk area: "Targets known risk: {area}"} |
| Performance | {n} | |
| {Extra dimension} | {n} | {Added due to: {stack signal}} |
```

The Notes column surfaces why certain dimensions have more cases (risk area targeting, coverage gap filling, stack-specific additions).

### Cold-Start Coverage Summary

Same format but only base 6 dimensions, no Notes annotations:

```markdown
### Coverage Summary

**By Priority:** P0: {n} | P1: {n} | P2: {n} | P3: {n} | Total: {total}

**By Dimension:** Happy Path: {n} | Negative: {n} | Boundary: {n} | Edge: {n} | Security: {n} | Performance: {n}
```

## 4. Preamble Assembly Order

1. Context preamble blockquote (full or cold-start)
2. Format selection note (which format, why, override instructions)
3. Test case output in selected format
4. Coverage summary section
5. Traceability summary
6. Cold-start footer (if applicable, per cold-start-pattern.md)
7. Suggested Next Steps
