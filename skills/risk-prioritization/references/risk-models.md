# Risk Scoring Models

Risk scoring formula, factor analysis guidance, and effort allocation model for test prioritization. Contains specific scoring thresholds, normalization rules, and inference heuristics.

## Risk Scoring Formula

Weighted three-factor combination, all factors normalized to 0-10 scale:

```
Risk Score = (ChangeFreq * 0.35) + (BusinessCriticality * 0.40) + (DefectDensity * 0.25)
```

**Weight rationale:**
- **Business Criticality (0.40):** Highest weight because business impact determines the cost of failure. A bug in payment processing costs more than a bug in an admin dashboard regardless of other factors.
- **Change Frequency (0.35):** Second highest because frequently changing code is statistically more likely to introduce regressions. Each change is an opportunity for defects.
- **Defect Density (0.25):** Lowest weight because historical defects indicate tendency but don't guarantee future issues. Code may have been refactored since defects were found.

**Score interpretation:**
| Score Range | Risk Level | Testing Implication |
|---|---|---|
| 9.0 - 10.0 | Critical | Maximum test coverage: all dimensions, security, performance, E2E |
| 7.0 - 8.9 | High | Comprehensive coverage: unit, integration, key E2E paths, security for sensitive areas |
| 5.0 - 6.9 | Medium | Standard coverage: unit tests, happy-path integration |
| 3.0 - 4.9 | Low | Basic coverage: unit tests, smoke-level integration |
| 1.0 - 2.9 | Minimal | Minimal: type safety, linting, occasional smoke test |

## Change Frequency Analysis

### Git Log Interpretation

Analyze commit frequency per module/directory within the specified time window.

**Recommended git commands:**

```bash
# Commits per directory (top-level modules)
git log --since="30 days ago" --name-only --pretty=format: | \
  grep -v '^$' | cut -d'/' -f1-2 | sort | uniq -c | sort -rn

# Commits per file (granular analysis)
git log --since="30 days ago" --name-only --pretty=format: | \
  grep -v '^$' | sort | uniq -c | sort -rn | head -20

# Unique authors per module (collaboration complexity signal)
git log --since="30 days ago" --format="%an %s" --name-only | \
  grep -E "^[a-zA-Z]" | sort -u
```

### Scoring Thresholds

Normalize raw commit counts to 0-10 scale:

| Commits in Time Window | Score | Label |
|---|---|---|
| > 50 commits | 10 | Extreme hotspot |
| 31-50 commits | 9 | Very high churn |
| 21-30 commits | 8 | High churn |
| 11-20 commits | 6-7 | Moderate churn |
| 6-10 commits | 4-5 | Normal activity |
| 2-5 commits | 2-3 | Low activity |
| 0-1 commits | 1 | Stable/dormant |

**Adjustment factors:**
- **Normalize by file count:** A module with 50 commits across 100 files is less risky than 50 commits in 5 files. Divide commit count by file count in the module, then re-score.
- **Recency weighting:** Apply exponential decay -- commits in the last 7 days count at full weight, 8-14 days at 0.75x, 15-21 days at 0.5x, 22-30 days at 0.25x. This surfaces areas actively being changed over areas that saw a burst of changes weeks ago.
- **Multi-author premium:** If 3+ unique authors modified the same module in the time window, add +1 to the score (capped at 10). Multiple authors increase miscommunication risk.

### Cold-Start Handling

When git analysis is not available (no repo access, shallow clone, or user provides no git data):
- Ask the user to estimate change frequency per area ("Which areas change most often?")
- Use a flat score of 5 for all areas if no information available
- Note in output: "Change frequency scores are estimated. Provide git repo access for data-driven scoring."

## Business Criticality Inference

When users provide explicit criticality annotations, use those directly (normalized to 0-10).

When inferring from file paths and framework roles:

### Path-Based Inference Rules

| Path Pattern | Inferred Criticality | Score |
|---|---|---|
| `auth/`, `authentication/`, `login/`, `session/` | Critical -- user access control | 9-10 |
| `payment/`, `billing/`, `checkout/`, `subscription/` | Critical -- financial transactions | 9-10 |
| `api/`, `routes/`, `controllers/`, `endpoints/` | High -- external-facing interfaces | 7-8 |
| `models/`, `entities/`, `schemas/` (data mutation) | High -- data integrity | 7-8 |
| `middleware/`, `interceptors/`, `guards/` | High -- cross-cutting concerns | 7-8 |
| `services/`, `business/`, `domain/` | Medium-High -- core business logic | 6-7 |
| `views/`, `pages/`, `components/` (user-facing) | Medium -- user experience | 5-6 |
| `lib/`, `utils/`, `helpers/`, `common/` | Medium-Low -- shared utilities | 3-4 |
| `scripts/`, `tools/`, `admin/` | Low -- internal tooling | 3-4 |
| `config/`, `constants/`, `types/`, `interfaces/` | Minimal -- definitions only | 1-2 |
| `test/`, `tests/`, `__tests__/`, `spec/` | N/A -- exclude from scoring | 0 |

### Framework-Specific Adjustments

Apply these modifiers to the base path-inferred score:

| Framework Role | Modifier | Rationale |
|---|---|---|
| Error handlers / exception filters | +2 | Failure in error handling cascades to all requests |
| Database migration files | +2 | Data loss risk from migration failures |
| Middleware in request pipeline | +1 | Affects all routes passing through |
| Background job processors | +1 | Silent failures are harder to detect |
| Static asset handlers | -1 | Low business logic risk |
| Test utilities / test helpers | -2 | Support code, not production |
| Documentation generators | -2 | No runtime impact |

### Override Priority

1. User-provided annotations (highest priority)
2. Project state `risks[]` area matches (adds context to inference)
3. Path-based inference with framework adjustments (default)

## Defect Density Scoring

Build a defect score per area from available signals, then normalize to 0-10.

### Signal Sources and Point Values

| Source | Signal | Points per Instance |
|---|---|---|
| Project state `risks[]` | Risk entry matching area | +2 per entry |
| Session `findings[]` | `type: "bug-report"` finding for area | +3 per finding |
| Session `findings[]` | `type: "coverage-gap"` with severity Critical for area | +2 per finding |
| Session `findings[]` | `type: "coverage-gap"` with severity High for area | +1 per finding |
| Session `skillHistory[]` | Prior risk-prioritization flagged area as top risk | +1 (convergent signal) |

### Normalization

Sum raw points per area, then normalize:

| Raw Points | Score | Label |
|---|---|---|
| >= 12 | 10 | Severe defect history |
| 9-11 | 8-9 | High defect density |
| 6-8 | 6-7 | Moderate defects |
| 3-5 | 4-5 | Some defects |
| 1-2 | 2-3 | Minor history |
| 0 | 1 | Clean (no known defects) |

### Module Size Normalization (Optional)

When module size data is available (file count or LOC), normalize defect count by module size:
- `Normalized Density = Raw Points / (file count in module)`
- Re-score using thresholds above but with adjusted scale
- This prevents large modules from appearing riskier simply due to having more files

### Cold-Start Handling

When no defect signals are available:
- Score all areas at 1 (clean baseline)
- Note in output: "Defect density scores are baseline. Run other QA skills (bug-report, coverage-gap) to build defect history for future analysis."

## Effort Allocation Model

Map composite risk scores to recommended percentage of test budget:

| Risk Score | Priority Tier | Budget Allocation | Testing Depth |
|---|---|---|---|
| 9-10 | Tier 1 (Critical) | 25-30% | All test types: unit, integration, E2E, security, performance. Maximum dimension coverage. |
| 7-8 | Tier 2 (High) | 15-20% | Unit + integration + key E2E paths. Security tests for sensitive areas. |
| 5-6 | Tier 3 (Medium) | 10-15% | Unit tests + happy-path integration. Selective E2E for main flows. |
| 3-4 | Tier 4 (Low) | 5-10% | Unit tests + smoke-level integration. |
| 1-2 | Tier 5 (Minimal) | < 5% | Type safety, linting, occasional smoke test. |

**Budget balancing rules:**
- Total allocation should sum to approximately 100% (allow 5% variance for rounding)
- If multiple areas in Tier 1, divide Tier 1 budget proportionally by score
- If no areas in Tier 1, redistribute that budget proportionally across Tier 2 and Tier 3
- Minimum 5% buffer for unplanned exploratory testing regardless of tier distribution

**Team size adjustments:**
- Solo developer: collapse Tier 4 and Tier 5 into "skip for now", increase Tier 1 to 35-40%
- Small team (2-4): use standard allocation
- Large team (5+): expand Tier 2 allocation to 20-25%, assign dedicated owners per tier

**Time constraint adjustments:**
- Tight deadline: focus exclusively on Tier 1 and Tier 2 (skip below score 7)
- Normal timeline: standard allocation across all tiers
- Generous timeline: expand Tier 3 depth to include integration tests, add Tier 4 integration tests
