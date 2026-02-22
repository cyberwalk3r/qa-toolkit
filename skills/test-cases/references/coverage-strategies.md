# Coverage Strategies

## By Risk Level
- **Critical paths first** — login, checkout, data submission, payments
- **Recently changed code** — highest bug density in new/modified code
- **Complex logic** — conditional flows, calculations, state machines
- **Integration points** — API calls, third-party services, database operations

## By Test Type
- **Functional**: Does it do what it should?
- **Negative**: Does it handle wrong inputs gracefully?
- **Boundary**: Does it work at limits (0, 1, max, max+1)?
- **Security**: Can it be exploited? (injection, auth bypass, XSS)
- **Performance**: Is it fast enough under load?
- **Compatibility**: Does it work across browsers/devices?
- **Accessibility**: Can everyone use it? (screen readers, keyboard)
- **Localization**: Does it work with different languages/locales?

## Prioritization Matrix
| Impact \ Likelihood | High | Medium | Low |
|---|---|---|---|
| **High** | P0 — Test first | P1 — Must test | P2 — Should test |
| **Medium** | P1 — Must test | P2 — Should test | P3 — Nice to test |
| **Low** | P2 — Should test | P3 — Nice to test | Skip or automate |
