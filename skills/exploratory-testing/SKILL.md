---
name: exploratory-testing
description: Generate a complete exploratory testing session package — charter, filtered heuristic prompts, time-boxing check-ins, and session notes templates — in one shot. Use this skill when a user wants to do unscripted testing, asks "how do I explore this feature manually?", or needs a structured charter for session-based testing of any feature or user flow.
---

# Exploratory Testing Session Guide

Generate a complete exploratory testing session package in one-shot output: an actionable charter, filtered heuristic prompts relevant to your scope, time-boxing guidance with periodic check-in prompts, and templates for capturing session notes and summarizing findings.

## Input

Accept via `$ARGUMENTS`: feature description, user story, area to explore, or charter text.

Optional in `$ARGUMENTS`:
- Duration hint: `30 min`, `60 min`, `90 min`
- Explicit charter text (if the user provides a full charter statement, use it directly)

The input defines the exploration scope. Examples:
- `"login flow with password reset"` -- derives charter from feature area
- `"Explore checkout focusing on payment edge cases for 60 min"` -- explicit scope, aspect, and duration
- `"user profile CRUD operations"` -- broader area, charter derived

## Workflow

### Step 1: Read State

Read `shared/references/state-integration.md` for the full state reading pattern.

Execute state reading commands:

```bash
PROJECT_STATE=$(node scripts/state-manager.js read project)
SESSION_STATE=$(node scripts/state-manager.js read session)
RISKS=$(node scripts/state-manager.js read project risks)
COVERAGE_GAPS=$(node scripts/state-manager.js read project coverageGaps)
DETECTION=$(node scripts/state-manager.js read project detection)
SKILL_HISTORY=$(node scripts/state-manager.js read session skillHistory)
FEATURE=$(node scripts/state-manager.js read session featureUnderTest)
```

Extract from project state:
- `detection.languages`, `detection.frameworks` -- for heuristic tag filtering and context preamble
- `risks[]` -- for suggesting focused exploration targets
- `coverageGaps[]` -- for prioritizing under-tested areas
- `detection.testFrameworks` -- for context awareness

Extract from session state:
- `featureUnderTest` -- for scope context
- `skillHistory[]` -- for prior output awareness (areas already explored)
- `findings[]` -- for cross-reference with prior skill output

If no state available (cold start), use defaults per `shared/references/cold-start-pattern.md`. Every conditional below has a fallback.

### Step 2: Parse Input

From `$ARGUMENTS`, identify:
- **Exploration scope/area** -- the feature, module, or workflow to explore
- **Duration hint** -- explicit duration if provided (30, 60, or 90 minutes)
- **Charter text** -- if user provided a full charter statement, use it directly in Step 4

Derive a charter scope name for the save path (e.g., "login flow with password reset" -> `login-password-reset`). Normalize: lowercase, alphanumeric, hyphens only.

### Step 3: Check Prior Output

Check session `skillHistory` for prior `exploratory-testing` invocations:

- If prior invocation found for **same area**: add note at top of output: "Note: A prior exploratory session for {area} was conducted this session (charter: {charter}). Areas explored: {areas}. Consider focusing on uncovered areas: {remaining}."
- If prior invocation found for **different area**: no action needed (different scope).
- If no prior invocation: no action needed (first session).

Always generate full output regardless of prior invocations.

### Step 4: Generate Charter

Create a structured charter statement following this format:

**Charter:** "Explore [area] focusing on [aspect] to discover [what we hope to learn]"

Derivation rules:
1. If user provided explicit charter text in `$ARGUMENTS`, use it directly.
2. Otherwise, derive from the input:
   - **[area]** -- the feature/module from parsed input
   - **[aspect]** -- inferred from input keywords, known risks, or coverage gaps. If risks[] overlap with the area, focus on the risk aspect. If coverageGaps[] overlap, focus on the gap.
   - **[what we hope to learn]** -- what information the session aims to uncover (defects, edge cases, behavior understanding, risk confirmation)

Make the charter specific and actionable:
- Good: "Explore login flow focusing on edge cases around password reset to discover whether error handling covers all failure modes"
- Bad: "Test login"

### Step 5: Select and Present Heuristics

Reference `references/heuristics.md` for the full heuristic catalog.

**Selection logic -- present 3-5 most relevant categories, not all 10:**

1. **Scope keyword matching:** Map input keywords to heuristic categories:
   - Login, auth, password, session -> Security, State Transition, Error Handling
   - Form, input, validation -> Boundary, Error Handling, Usability
   - CRUD, database, records -> CRUD, Boundary, State Transition
   - API, endpoint, request -> SFDIPOT, Error Handling, Security
   - UI, page, screen, flow -> Usability, Accessibility, Consistency
   - Performance, load, speed -> Performance, Boundary
   - Payment, checkout, transaction -> Security, Error Handling, CRUD

2. **Stack tag filtering:** Match heuristic tags against detected stack:
   - Web app detected (React, Vue, Angular, Next.js) -> include `web`-tagged heuristics
   - API detected (Express, Fastify, NestJS) -> include `api`-tagged heuristics
   - Mobile detected (React Native, Flutter) -> include `mobile`-tagged heuristics
   - Database detected (Prisma, TypeORM, Mongoose) -> include `data`-tagged heuristics
   - `all`-tagged heuristics are always eligible
   - Cold start (no detection) -> all tags eligible, rely on scope keyword matching only

3. **Risk area targeting:** If project `risks[]` overlap with the exploration scope, include heuristic categories that address those risk types.

4. **Always include SFDIPOT** as the primary framework unless input scope is narrow enough that a specialized subset is clearly more useful.

5. **Selection cap:** Present 3-5 categories. If more than 5 match, prioritize by: risk-targeted > scope-keyword-matched > stack-tag-matched.

For each selected category, present:
- Category name and one-line description
- The concrete prompt questions from the reference file
- A brief note on why this category was selected (transparency)

### Step 6: Generate Session Package

Produce the complete one-shot output with all sections:

#### a) Charter

Display the charter from Step 4 in a prominent callout format:

```markdown
### Charter

> **Explore** [area] **focusing on** [aspect] **to discover** [what we hope to learn]
```

#### b) Suggested Duration

Recommend a session duration based on scope breadth:

| Scope | Recommended Duration | Rationale |
|-------|---------------------|-----------|
| Single feature or narrow flow | 30 minutes | Focused depth on one area |
| Feature with multiple sub-flows | 60 minutes | Balanced depth and breadth |
| Module or cross-cutting concern | 90 minutes | Broad exploration with time for deep dives |

If the user specified a duration in `$ARGUMENTS`, use that instead and note: "Using your requested duration of {N} minutes."

#### c) Heuristic Prompts

Present the selected heuristics from Step 5. For each category:

```markdown
#### {Category Name}
*Selected because: {reason}*

- {prompt question 1}
- {prompt question 2}
- {prompt question 3}
```

#### d) Check-In Prompts

Time-stamped reflection points based on the session duration. The user self-manages timing.

```markdown
### Check-In Prompts

| Time | Prompt |
|------|--------|
| {25% of duration} | **Scope check:** Are you still within charter scope? Note any interesting tangents for a future session. |
| {50% of duration} | **Pattern check:** What patterns are emerging? Any areas to dig deeper? Update your notes with observations so far. |
| {75% of duration} | **Coverage check:** What haven't you tried yet from the heuristic prompts? Consider switching your approach or testing technique. |
| {90% of duration} | **Wrap-up:** Start capturing remaining observations. Note areas you didn't reach and any follow-up actions. |
```

Calculate actual timestamps from the suggested duration (e.g., 60 min session: 15 min, 30 min, 45 min, 54 min).

#### e) Session Notes Template

Markdown template with headers and bullet placeholders for the user to fill in during the session:

```markdown
### Session Notes

#### Observations
<!-- Things noticed during testing -- both positive and negative -->
-

#### Bugs Found
<!-- For each bug: brief description, severity estimate, steps to reproduce -->
- **Bug:**
  - **Severity:** Critical / High / Medium / Low
  - **Steps:** 1. ... 2. ... 3. ...
  - **Expected:**
  - **Actual:**

#### Questions
<!-- Things to investigate further or ask the team about -->
-

#### Ideas
<!-- Test cases to write, areas to explore in future sessions, improvement suggestions -->
-

#### Areas Covered
<!-- What was actually tested during this session -->
-

#### Areas Remaining
<!-- What was not reached -- input for future sessions -->
-
```

#### f) Session Summary Template

Post-session template for summarizing findings:

```markdown
### Session Summary

**Charter completion:** Fully completed / Partially completed / Pivoted to different area
**Actual duration:** __ minutes
**Overall assessment:**

#### Findings by Severity

| Severity | Count | Key Finding |
|----------|-------|-------------|
| Critical | | |
| High | | |
| Medium | | |
| Low | | |

#### Follow-Up Actions

- [ ]
- [ ]
- [ ]
```

### Step 7: Format Output

Read `shared/references/context-preamble.md` and generate the context preamble.

**Full context preamble** (when project state is available):

```markdown
> **Project Context**
> Stack: {languages} | Frameworks: {frameworks} | Test Framework: {testFrameworks}
> Known Risks: {risk areas with counts}
> Coverage Gaps: {gap areas}
> Session: Testing {featureUnderTest} | Prior: {priorSkillSummary}
>
> **Why this charter:** {frameworks} detected -- heuristics tailored to {framework} patterns.
> Known risk areas ({risks}) suggest focused exploration targets.
> Prior test cases from session cover {areas} -- exploring untested areas.
```

Build the "Why this charter" line from state signals:
1. If frameworks detected: "{framework} detected -- heuristics tailored to {framework} patterns"
2. If risk areas overlap with charter scope: "Known risk areas ({risk areas}) suggest focused exploration targets"
3. If prior skill output covers related areas: "Prior {skill} output covers {areas} -- exploring untested territory"
4. If no special signals: "Standard exploration using scope-matched heuristics"

**Cold-start preamble** (when no project context is available):

```markdown
> **Project Context**
> Stack: Not detected | Test Framework: Not detected
>
> **Why this charter:** Standard exploration using scope-matched heuristics. Run `/qa-setup` or start a new session for stack-tailored heuristic selection.
```

### Step 8: Write Session State

After generating output, write execution summary to session state:

```bash
node scripts/state-manager.js write session skillHistory '{
  "skill": "exploratory-testing",
  "feature": "<charter-scope>",
  "timestamp": "<ISO-8601>",
  "charter": "<charter-text>",
  "duration": "<30|60|90>",
  "bugsFound": 0,
  "observationsCount": 0,
  "areasExplored": ["<area1>", "<area2>"],
  "areasRemaining": ["<area1>"]
}'

node scripts/state-manager.js merge session findings '{
  "area": "<charter-scope>",
  "type": "exploratory-testing",
  "summary": "Exploratory session chartered: <charter-text>. Duration: <N>min. Heuristics: <selected categories>."
}'
```

Note: `bugsFound` and `observationsCount` are initialized to 0. If the user re-runs the skill after completing their session with filled-in notes, these can be updated. The initial state write captures the session plan, not the session results.

## Output Section Order

1. **Context preamble** -- blockquote with project context and "Why this charter" line
2. **Prior output note** -- if applicable (Step 3)
3. **Charter** -- prominent callout with the charter statement
4. **Suggested Duration** -- with rationale
5. **Heuristic Prompts** -- filtered categories with selection rationale and concrete questions
6. **Check-In Prompts** -- time-stamped reflection points based on duration
7. **Session Notes Template** -- structured template for mid-session capture
8. **Session Summary Template** -- post-session findings summary
9. **Cold-start footer** -- if applicable, per `shared/references/cold-start-pattern.md`
10. **Suggested Next Steps**

## Save

Save to `qa-artifacts/exploratory/session-YYYY-MM-DD-<charter-scope>.md`

## Suggested Next Steps

After generating the session package, suggest based on context:

- "Found bugs during your session? Structure them with `/qa-toolkit:bug-report`."
- "Identified test gaps? Generate structured test cases with `/qa-toolkit:test-cases`."
- "Want to explore another area? Run `/qa-toolkit:exploratory-testing` again with a new charter."
- If risk areas from project state remain unexplored: "High-risk area **{area}** was not covered in this session -- consider a focused exploratory session targeting it."
- If prior test-cases output exists in session: "Your test cases cover {areas} -- this session explores beyond documented cases."
