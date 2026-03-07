# Coverage Strategies

## Prioritization Matrix

| Impact \ Likelihood | High | Medium | Low |
|---|---|---|---|
| **High** | P0 -- Test first | P1 -- Must test | P2 -- Should test |
| **Medium** | P1 -- Must test | P2 -- Should test | P3 -- Nice to test |
| **Low** | P2 -- Should test | P3 -- Nice to test | Skip or defer |

## State-Driven Priority Escalation

Project state overrides the base matrix in two cases:

**Known risk areas** (`risks[]` from project state):
- Any test case targeting a risk area auto-escalates to **P0** regardless of matrix position
- Annotate inline: `**P0 -- targets known risk: {area} ({count} occurrences)**`
- Rationale: risk areas have demonstrated failure history; they need smoke-level coverage

**Coverage gaps** (`coverageGaps[]` from project state):
- Any test case in a gap area auto-escalates to **P1** minimum
- If the gap area also has a risk entry, escalate to P0 (risk takes precedence)
- Rationale: gaps represent untested surface area; critical cases should not remain at P2+

## Risk Coverage Strategy

When `risks[]` is populated, prioritize test dimensions that target those areas:

1. Map each risk area to the most relevant test dimensions (security risks -> security dimension, data risks -> boundary + edge dimensions)
2. Ensure at least one P0 test case per risk area
3. Annotate risk-targeting cases inline (no separate risk section)

When `risks[]` is empty (cold start or no known risks), use standard matrix without escalation.

## Gap Coverage Strategy

When `coverageGaps[]` is populated:

1. Identify which test dimensions address each gap (e.g., "error handling" gap -> negative + edge dimensions)
2. Generate additional cases in those dimensions beyond the baseline
3. Note in coverage summary which dimensions were expanded due to gaps

When `coverageGaps[]` is empty, generate baseline coverage across all dimensions.

## Dimension-Specific Guidance

- **Happy path**: 2-3 cases covering the primary success flows
- **Negative**: 1 case per distinct error condition; focus on user-facing error messages
- **Boundary**: test at min, max, and one-off limits; derive limits from requirements or conventions
- **Edge**: concurrent access, timeouts, partial failures; prioritize based on architecture
- **Security**: injection vectors, auth bypass, privilege escalation; auto-P0 if auth is a risk area
- **Performance**: response time, load, stress; include only if performance requirements are stated or implied
