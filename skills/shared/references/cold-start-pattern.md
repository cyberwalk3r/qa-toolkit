# Cold-Start Graceful Degradation Pattern

Every skill must produce useful output on first invocation -- even with no prior session, no detection data, and no config files. This reference defines the single pattern all skills follow.

## 1. State Reading Pattern

Read state files from the configured output directory. Handle every failure mode silently.

```
outputDir = read settings.json -> outputDir (default: "qa-artifacts")

1. Try reading <outputDir>/.qa-context.json
   - File missing?      -> use empty defaults (do NOT error)
   - JSON parse error?  -> use empty defaults (do NOT error)
   - Schema mismatch?   -> use empty defaults (state-manager handles this)

2. Try reading <outputDir>/.qa-session.json (if session context is relevant)
   - Same handling: missing or corrupt -> empty defaults
```

The state-manager.js `readStateFile()` already implements this fallback-to-defaults behavior. Skills reading state directly (without state-manager) must replicate it.

## 2. Defensive Access Pattern

Never assume nested objects exist. Always use optional chaining with inline defaults.

```
const languages     = config?.detection?.languages       || []
const frameworks    = config?.detection?.frameworks      || []
const testFrameworks = config?.detection?.testFrameworks  || []
const testDirs      = config?.detection?.existingTestDirs || []
const packageManager = config?.detection?.packageManager  || null
const monorepo      = config?.detection?.monorepo        || null

const formatting    = config?.conventions?.formatting     || null
const linting       = config?.conventions?.linting        || null
const typescript    = config?.conventions?.typescript     || null
const testPatterns  = config?.conventions?.testPatterns   || null
```

### Common field paths and defaults

| Field Path | Default | Type |
|---|---|---|
| `config.detection.languages` | `[]` | string array |
| `config.detection.frameworks` | `[]` | string array |
| `config.detection.testFrameworks` | `[]` | string array |
| `config.detection.existingTestDirs` | `[]` | string array |
| `config.detection.packageManager` | `null` | string or null |
| `config.detection.monorepo` | `null` | object or null |
| `config.conventions.formatting` | `null` | string or null |
| `config.conventions.linting` | `null` | string or null |
| `config.conventions.typescript` | `null` | object or null |
| `config.conventions.testPatterns` | `null` | object or null |

When interpolating into output text, provide a human-readable fallback:

```
const framework = config?.detection?.frameworks?.[0] || 'your framework'
const testTool  = config?.detection?.testFrameworks?.[0] || 'your test framework'
```

## 3. Contextual Adaptation

Skills adapt their output depth based on what context is available.

**When project context IS available** (detection populated):
- Tailor examples to detected languages and frameworks
- Reference detected test directories and naming conventions
- Use detected package manager in commands (`npm`, `yarn`, `pnpm`)
- Apply detected formatting/linting conventions

**When project context is NOT available** (cold start):
- Use generic best-practice defaults
- Provide broader coverage across common stacks
- Use framework-agnostic advice
- Show placeholder values the user can customize

Example adaptation:

```
If testFrameworks includes 'Playwright':
  -> Generate Playwright-specific fixtures, selectors, and config
  -> Reference detected test directories for file placement

If testFrameworks is empty:
  -> Generate generic E2E test structure
  -> Suggest common frameworks the user can pick from
```

## 4. Footer Note Pattern

When a skill detects it ran without project context, append a footer guiding the user toward richer output.

**Show the footer when:**
- `.qa-context.json` was not found, OR
- `detection.languages` is empty or missing

**Do NOT show the footer when:**
- Project context exists, even if partial (any non-empty detection field counts)

**Exact footer text:**

```markdown
---
*Note: Generated without project context. Run `/qa-setup` or start a new session for tailored output.*
```

**Detection logic:**

```
const hasContext = Array.isArray(config?.detection?.languages)
                  && config.detection.languages.length > 0

if (!hasContext) {
  append footer to output
}
```

## 5. Anti-Patterns

These are explicitly prohibited in skill implementations:

| Anti-Pattern | Why It Breaks Cold Start |
|---|---|
| Prompting for missing context ("What framework are you using?") | Blocks output; user invoked a skill expecting a result |
| Inline detection ("Let me scan your project...") | Duplicates detect-project.js; slow; inconsistent results |
| Erroring on missing state files | Prevents any output on first run |
| Importing shared JS utilities | Skills are markdown-driven; no code dependencies between skills |
| Blocking on state before producing output | Violates the core principle: always produce output |
| Requiring session state for basic functionality | Session state is supplementary, not required |
