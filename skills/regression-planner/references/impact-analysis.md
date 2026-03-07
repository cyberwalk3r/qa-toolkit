# Impact Analysis Heuristics

## File-Based Impact Mapping

| Changed File Pattern | Likely Impact Area |
|---|---|
| `auth/*`, `login/*`, `session/*` | All authenticated features |
| `middleware/*` | Everything downstream of that middleware |
| `database/*`, `migration/*`, `schema/*` | All features using affected tables |
| `api/*`, `routes/*`, `controllers/*` | API consumers (frontend, mobile, integrations) |
| `components/shared/*`, `utils/*`, `lib/*` | All consumers of shared code — wide blast radius |
| `config/*`, `.env*` | Environment-specific behavior changes |
| `package.json`, `requirements.txt` | Build, test, and runtime behavior |
| `styles/*`, `css/*`, `theme/*` | Visual regression across all pages |

## Dependency Direction

### Upstream Changes (High Impact)
Changes to code that many things depend on:
- Shared utilities, base classes, common components
- Database models, ORM configurations
- Authentication/authorization modules
- API middleware, interceptors

### Downstream Changes (Lower Impact)
Changes to leaf-node code:
- Specific page components
- Individual API endpoints (if no shared logic)
- Config files for specific features

## Risk Multipliers
- **Data mutations** (writes, updates, deletes) — 3× risk
- **Financial operations** — 5× risk
- **Multi-service changes** — 2× risk per service
- **First-time contributor** — 1.5× risk
- **Large diff** (>500 lines) — 2× risk
- **No test changes** with code changes — 2× risk

## State-Driven Prioritization

When project or session state is available, apply these additional prioritization rules on top of the file-based heuristics above.

### From Project State

**Risk area boost:** If an impact area matches a known `risks[]` entry, boost its risk level by one tier (Low -> Medium, Medium -> High). High stays High.

**Coverage gap flagging:** If an impact area matches a `coverageGaps[]` entry, flag it with "Coverage gap -- prioritize testing" and boost one tier.

**Monorepo cross-package multiplier:** When `detection.monorepo` is present, any change crossing package boundaries gets a 2x risk multiplier. Add to the Risk Multipliers table above:

| Additional Multiplier | Condition |
|---|---|
| **Cross-package change** (monorepo) | 2x risk |

### From Session State

**Prior pr-review findings:** If a prior `pr-review` skillHistory entry is found in session state:
- Seed impact analysis with its `affectedAreas` as starting points instead of relying only on file-based mapping
- Boost risk of areas matching its `riskFlags`
- If its `riskLevel` is "high" or "critical", default recommended scope to "standard" minimum (skip "quick")

**Prior bug-report findings:** If a prior `bug-report` skillHistory entry is found in session state:
- Boost risk for its `component` area by one tier

### Cold-Start Behavior

When no project or session state is available, use only the file-based impact mapping and risk multipliers above.
