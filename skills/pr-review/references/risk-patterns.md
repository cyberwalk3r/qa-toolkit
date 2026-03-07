# Risk Patterns by Tech Stack

## Frontend (React, Vue, Angular, Svelte)

### High Risk
- State management changes — can cause stale UI, infinite re-renders
- Route changes — broken navigation, lost query params
- Form validation changes — bypassed validation, data loss
- Authentication flow — login/logout/session expiry edge cases
- Third-party SDK updates — breaking API changes

### Medium Risk
- Component prop changes — type mismatches, missing defaults
- CSS/styling changes — layout breaks on different viewports
- Event handler changes — click/submit race conditions
- Lazy loading/code splitting — broken chunk loading

### Common QA Checks
- [ ] Test on multiple browsers (Chrome, Firefox, Safari)
- [ ] Test responsive behavior (mobile, tablet, desktop)
- [ ] Check loading states and error states
- [ ] Verify form submission with valid and invalid data
- [ ] Test keyboard navigation for accessibility

---

## Backend API (Express, FastAPI, Django, Spring, .NET)

### High Risk
- Database schema/migration changes — data integrity
- Authentication middleware — permission bypass
- Input validation changes — injection vulnerabilities
- Rate limiting/throttling changes — abuse potential
- Payment/billing logic — financial impact

### Medium Risk
- Response format changes — breaking API consumers
- Error response changes — frontend error handling
- Caching logic — stale data served
- File upload handling — size/type validation
- Background job changes — retry/failure behavior

### Common QA Checks
- [ ] Test with valid, invalid, and edge-case inputs
- [ ] Verify error responses have correct status codes and messages
- [ ] Check authorization for different user roles
- [ ] Test with empty/null/undefined values
- [ ] Verify database state after operations

---

## Mobile (React Native, Flutter, Swift, Kotlin)

### High Risk
- Navigation changes — deep links, back button behavior
- Offline/network handling — data sync, queue management
- Permission requests — camera, location, notifications
- Push notification handling — background/foreground behavior

### Medium Risk
- Platform-specific code — iOS vs Android differences
- Keyboard behavior — form fields, scroll blocking
- Image/media handling — memory leaks, caching
- App lifecycle — background/foreground transitions

---

## Infrastructure (CI/CD, Docker, Kubernetes)

### High Risk
- Environment variable changes — missing or wrong values
- Deployment config — wrong target, missing rollback
- Secret management — exposed credentials
- Database connection strings — wrong environment

### Medium Risk
- Build script changes — broken builds, missing steps
- Dockerfile changes — image size, missing dependencies
- Health check changes — false positives/negatives

---

## Dynamic Risk Enhancement

Combine static patterns above with dynamic project risks from state. Static patterns provide the baseline; project state raises or adds risk flags based on actual project history.

### From Project State

| State Field | Match Logic | Risk Effect |
|---|---|---|
| `risks[]` | Match `risks[].area` against changed file paths and functional areas | Boost matching static pattern: Medium -> High, High -> Critical |
| `coverageGaps[]` | Match `coverageGaps[].area` against changed file paths | Add risk flag: `⚠️ Coverage gap: {area}` regardless of static pattern match |
| `detection.monorepo` | Changed files span multiple workspace packages | Add risk flag: `🔴 Cross-package change` -- changes in shared packages affect all consumers |

### Priority Rules

| Condition | Result |
|---|---|
| Changed file matches static High Risk pattern AND `risks[]` area | **Critical** -- both static and dynamic signals confirm high risk |
| Changed file matches static pattern, NOT in `risks[]` | Use static level as-is |
| Changed file in `risks[]` area, NO static pattern match | **Medium** risk with context: "Known risk area: {area} ({count} prior issues)" |
| Changed file in `coverageGaps[]` area | Add `⚠️ Coverage gap` flag at any risk level |
| Cross-package change in monorepo | Add `🔴 Cross-package change` flag at any risk level |

### Cold-Start Behavior

When no project state is available, use only the static patterns above. Do not generate dynamic risk flags.
