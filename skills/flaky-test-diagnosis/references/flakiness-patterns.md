# Flakiness Patterns Reference

Root cause catalog with specific detection signals, framework-specific patterns, and fix strategies for diagnosing flaky tests.

## Root Cause Catalog

### 1. Timing/Async

Flakiness caused by race conditions, improper async handling, or hardcoded delays.

**Detection Signals:**
- `setTimeout`, `sleep`, `waitFor` without assertion callback
- `Promise.race` without proper timeout handling
- Hardcoded delays (`await sleep(2000)`, `time.sleep(1)`)
- Missing `await` on async operations
- `setInterval` in test setup without cleanup
- Assertions running before async state settles
- `act()` warnings in React test output

**Common Manifestations:**
- Playwright: selector timing -- `page.click('.button')` before element is interactive, `waitForSelector` without state check, `networkidle` wait strategy unreliable for SPAs with WebSocket connections
- Jest: async state updates -- `setState` assertions without `waitFor`, timer-dependent code without `jest.useFakeTimers()`, unresolved promises in `afterEach`
- pytest: asyncio fixtures -- `event_loop` fixture scope mismatch, `asyncio.gather` without timeout, `aiohttp` test client not awaited properly
- Vitest: similar to Jest but `vi.useFakeTimers()` has different default behavior for `Date`

**Failure Log Signatures:**
- "Timeout exceeded", "Expected element to be visible", "Received: undefined" (value not yet settled)
- "Exceeded timeout of 5000ms" (Jest), "Timeout 30000ms exceeded" (Playwright)

---

### 2. Shared State

Flakiness caused by tests modifying shared state that leaks between test cases.

**Detection Signals:**
- Global variables modified in tests (`global.`, `window.`, module-level `let`/`var`)
- Database rows created but not cleaned up between tests
- Singleton patterns used in test subjects (cache, connection pool, config)
- Module-level caches (`const cache = new Map()` at file top)
- `beforeAll` setting state consumed by multiple tests without reset
- Environment variables set in one test affecting another (`process.env.`)
- In-memory stores (Redux, Zustand, Pinia) not reset between tests

**Common Manifestations:**
- Jest: module cache -- `jest.mock()` in one test affecting subsequent tests in the same file, `jest.resetModules()` missing, `jest.restoreAllMocks()` not called
- pytest: session-scope fixtures shared across tests -- database session not rolled back, module-scope fixtures with mutable state, `conftest.py` side effects
- Playwright: browser storage (localStorage, cookies) persisting between tests, `storageState` reuse without cleanup

**Failure Log Signatures:**
- "Expected 0 but received 3" (accumulated state), "already exists" (duplicate creation), "not found" (deleted by another test)

---

### 3. External Dependency

Flakiness caused by tests relying on external services, network, or system resources.

**Detection Signals:**
- Unmocked HTTP calls (`fetch`, `axios`, `requests`, `got`, `superagent`) in unit/integration tests
- Filesystem reads/writes without temp directories (`fs.writeFileSync('/tmp/...')` with no cleanup)
- Clock-dependent tests (`Date.now()`, `time.time()`, `new Date()` in assertions)
- DNS lookups in test setup (real hostnames instead of localhost)
- SMTP/email service calls without mock
- Third-party API calls (Stripe, AWS, database-as-a-service)
- File system watchers or event emitters depending on OS timing

**Common Manifestations:**
- API tests hitting real endpoints that rate-limit or go down
- Date assertions failing at midnight, month boundaries, or DST transitions
- File system tests failing on CI due to different `/tmp` cleanup policies
- Tests depending on specific DNS resolution or network topology

**Failure Log Signatures:**
- "ECONNREFUSED", "ENOTFOUND", "socket hang up", "timeout"
- "Expected 2025-01-01 but received 2025-01-02" (timezone/midnight)

---

### 4. Test Order Dependence

Flakiness caused by tests that pass individually but fail when run in specific orders.

**Detection Signals:**
- Tests pass with `--runInBand` but fail in parallel (or vice versa)
- `describe` blocks with shared `let` variables mutated across `it` blocks
- Missing `beforeEach` reset for state set up in `beforeAll`
- `afterAll` cleanup that other test files depend on having run
- Test file import order mattering (side effects on import)
- `--randomize` flag causing failures (Jest `--randomize`, pytest `pytest-randomly`)

**Common Manifestations:**
- Jest: test files sharing module state via `jest.mock()` at file level, `--forceExit` masking unfinished async work
- pytest: `conftest.py` fixtures with side effects, `autouse` fixtures creating implicit dependencies, parametrize ordering with stateful fixtures
- Playwright: test.describe blocks sharing page state, `test.beforeAll` creating data that `test.afterAll` in a different file deletes

**Failure Log Signatures:**
- "Cannot read property of undefined" (state from prior test missing), passes in isolation but fails in suite

---

### 5. Resource Contention

Flakiness caused by tests competing for shared system resources.

**Detection Signals:**
- Hardcoded ports (`localhost:3000`, `127.0.0.1:5432`) without dynamic allocation
- File locks on shared paths (SQLite database files, log files)
- Parallel test execution with shared database (same tables, no transaction isolation)
- Browser instance reuse without cleanup (Playwright `browser.newContext()` vs reusing existing)
- Thread/process pool exhaustion in test runner
- Docker container port conflicts in CI

**Common Manifestations:**
- "Port 3000 already in use" when running tests in parallel
- Database deadlocks from concurrent test transactions
- File permission errors from parallel file operations
- Browser resource limits (too many contexts open)

**Failure Log Signatures:**
- "EADDRINUSE", "deadlock detected", "lock timeout", "too many open files"

---

### 6. Environment Differences

Flakiness caused by tests that assume a specific execution environment.

**Detection Signals:**
- Hardcoded paths (`/home/user/...`, `C:\Users\...`, `/Users/`)
- Timezone-dependent assertions (`toLocaleDateString()`, `toLocaleTimeString()`)
- Locale-dependent formatting (`Intl.NumberFormat`, `toLocaleString()`)
- OS-specific line endings (`\r\n` vs `\n` in snapshots)
- Case-sensitive filesystem assumptions (macOS HFS+ vs Linux ext4)
- Architecture-dependent behavior (ARM vs x86, 32-bit vs 64-bit)
- Node.js/Python version-specific APIs or behavior changes

**Common Manifestations:**
- Snapshot tests failing on CI but passing locally (different OS, locale, or timezone)
- Date formatting tests failing in different timezones
- Path comparison tests failing on Windows vs Unix
- Floating-point precision differences across architectures

**Failure Log Signatures:**
- "Expected '/home/ci/...' but received '/home/dev/...'", snapshot diff with whitespace/encoding differences

---

## Framework-Specific Patterns

### Jest

| Pattern | Signal | Fix |
|---|---|---|
| Fake timers not advanced | `jest.useFakeTimers()` without `jest.advanceTimersByTime()` or `jest.runAllTimers()` | Add timer advancement after operations that schedule timers |
| Module mock leakage | `jest.mock()` at file top without `jest.restoreAllMocks()` in `afterEach` | Add `afterEach(() => jest.restoreAllMocks())` or use `jest.config` `restoreMocks: true` |
| jsdom vs node environment | Tests assume browser APIs in node environment or vice versa | Set `testEnvironment` per file via docblock: `/** @jest-environment jsdom */` |
| Unhandled promise rejection | Async error in `beforeAll` not caught, next tests see corrupt state | Wrap `beforeAll` async work in try/catch, fail explicitly |
| Snapshot serializer drift | Custom serializers registered globally, order-dependent | Use inline snapshots or per-file serializer setup |

### Playwright

| Pattern | Signal | Fix |
|---|---|---|
| networkidle unreliable | `page.goto(url, { waitUntil: 'networkidle' })` with WebSocket/SSE | Use `page.waitForSelector()` or `page.waitForResponse()` for specific readiness signal |
| Selector auto-waiting insufficient | Dynamic content loaded after initial render | Use `page.waitForSelector('.loaded-indicator')` or `expect(locator).toBeVisible()` with timeout |
| Browser context reuse | `test.describe` sharing context without isolation | Use `test.beforeEach` to create fresh context, or `test({ storageState: undefined })` |
| Animation/transition timing | Assertions during CSS transitions | Add `await page.waitForTimeout(0)` to flush microtasks, or disable animations in test config |
| Download/upload race | File operations not awaited properly | Use `page.waitForEvent('download')` before triggering download action |

### pytest

| Pattern | Signal | Fix |
|---|---|---|
| Fixture scope confusion | `@pytest.fixture(scope="session")` with mutable state | Use `scope="function"` for mutable fixtures, or return fresh copies via `copy.deepcopy()` |
| Parametrize with state | `@pytest.mark.parametrize` combined with stateful fixture | Ensure fixture provides independent state per parameter combination |
| conftest.py side effects | `conftest.py` at package level running code on import | Move side effects into fixtures, not module-level code |
| Database transaction not rolled back | Test creates DB rows without cleanup | Use `@pytest.fixture` with `yield` and rollback, or `transactional_db` in Django |
| Async event loop reuse | `pytest-asyncio` sharing event loop across tests | Set `asyncio_mode = "auto"` and `loop_scope = "function"` in config |

### Vitest

| Pattern | Signal | Fix |
|---|---|---|
| Watch mode isolation | Tests share module state in watch mode | Use `--pool=forks` or `--isolate` for module-level isolation |
| Timer behavior differences | `vi.useFakeTimers()` defaults differ from Jest | Explicitly configure `shouldAdvanceTime` and `toFake` options |
| Happy DOM vs jsdom | Different DOM implementation behaviors | Pin environment per test file via `// @vitest-environment jsdom` |

---

## Fix Strategy Decision Tree

For each root cause category, follow the decision tree to the recommended fix:

### Timing/Async
```
Is there a hardcoded delay (sleep/setTimeout)?
  YES -> Replace with explicit wait-for-condition:
         Playwright: await expect(locator).toBeVisible({ timeout: 5000 })
         Jest: await waitFor(() => expect(element).toBeInTheDocument())
         pytest: Use tenacity retry or asyncio.wait_for with condition
  NO -> Is there a missing await?
    YES -> Add await. Check entire async chain for missing awaits.
    NO -> Is the test racing against async state?
      YES -> Add explicit synchronization point (waitFor, event, signal)
      NO -> Check if test framework timer mocking is needed
```

### Shared State
```
Is state stored in a global/module variable?
  YES -> Reset in beforeEach/setUp or use test-local scope
  NO -> Is state stored in database?
    YES -> Use transaction rollback per test, or truncate in afterEach
    NO -> Is state stored in module cache/singleton?
      YES -> Jest: jest.resetModules() in afterEach
             pytest: Use fresh fixture instances (scope="function")
      NO -> Check for environment variable pollution (process.env)
            -> Save and restore in beforeEach/afterEach
```

### External Dependency
```
Is the test calling a real HTTP endpoint?
  YES -> Mock with MSW (browser), nock/msw (Node), responses (Python)
  NO -> Is the test using real clock/time?
    YES -> Use fake timers (jest.useFakeTimers, freezegun, libfaketime)
    NO -> Is the test using real filesystem?
      YES -> Use tmp directories (os.tmpdir(), tmp-promise, pytest tmp_path)
      NO -> Check for DNS, SMTP, or other network dependencies -> Mock
```

### Test Order Dependence
```
Does the test fail only when run with other tests?
  YES -> Does it pass with --runInBand/sequential execution?
    YES -> Shared state issue (see Shared State tree above)
    NO -> Does it fail with specific test ordering?
      YES -> Find the test that creates the dependency
             -> Move shared setup to beforeEach with proper reset
      NO -> Check for import side effects -> Isolate modules
  NO -> Likely not order-dependent -- reclassify
```

### Resource Contention
```
Is a port hardcoded?
  YES -> Use dynamic port allocation (port 0, detect-port, get-port)
  NO -> Is a database shared between parallel tests?
    YES -> Use per-test schemas, transaction isolation, or sequential execution
    NO -> Are file resources shared?
      YES -> Use unique temp paths per test (include test ID in path)
      NO -> Check for process/thread pool limits -> Increase or serialize
```

### Environment Differences
```
Does the test use hardcoded paths?
  YES -> Use path.join, os.path.join, or process.cwd()-relative paths
  NO -> Does the test depend on timezone?
    YES -> Set TZ in test setup or use UTC-only assertions
    NO -> Does the test depend on locale?
      YES -> Set explicit locale in test or use locale-independent formatting
      NO -> Check for OS-specific behavior (line endings, case sensitivity)
            -> Normalize in assertions or use cross-platform utilities
```
