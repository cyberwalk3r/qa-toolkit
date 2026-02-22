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
