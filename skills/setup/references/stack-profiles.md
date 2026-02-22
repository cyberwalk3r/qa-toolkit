# Tech Stack Profiles for QA Configuration

## JavaScript/TypeScript (React, Next.js, Vue, Angular)

### Testing Conventions
- Component tests with Testing Library (prefer user-centric queries)
- E2E tests with Playwright or Cypress
- API routes tested with supertest or Playwright API
- Snapshot tests for UI regression (use sparingly)

### High-Risk Areas
- State management (Redux, Zustand, Context) — race conditions, stale state
- Server-side rendering / hydration mismatches (Next.js, Nuxt)
- API route handlers — input validation, auth middleware
- Form handling — validation, submission edge cases
- Third-party integrations — payment, auth providers

### CLAUDE.md QA Template
```
- Test files co-located with source: `Component.test.tsx`
- Run tests: `npm test` or `npx jest`
- E2E tests: `npx playwright test`
- Coverage: aim for >80% on critical paths
```

---

## Python (Django, Flask, FastAPI)

### Testing Conventions
- Pytest as primary test runner
- Django TestCase for DB-dependent tests
- Factory Boy or Faker for test data
- API tests with pytest + httpx or requests

### High-Risk Areas
- Database migrations — data integrity, backward compatibility
- Authentication/authorization — permission checks, session handling
- Background tasks (Celery) — retry logic, failure handling
- File uploads — size limits, type validation, storage
- API serialization — nested objects, null handling

### CLAUDE.md QA Template
```
- Test files: `tests/test_*.py` or `*_test.py`
- Run tests: `pytest` or `python manage.py test`
- Coverage: `pytest --cov`
```

---

## C#/.NET

### Testing Conventions
- NUnit or xUnit for unit tests
- Integration tests with WebApplicationFactory
- Moq for dependency mocking

### High-Risk Areas
- Entity Framework migrations
- Dependency injection configuration
- Middleware pipeline order
- async/await patterns — deadlocks, cancellation tokens

---

## Java/Kotlin (Spring Boot, Android)

### Testing Conventions
- JUnit 5 for unit tests
- Mockito for mocking
- Spring Boot Test for integration
- Espresso for Android UI

### High-Risk Areas
- Spring Security configuration
- Database transactions and rollback
- REST controller input validation
- Thread safety in concurrent operations

---

## Go

### Testing Conventions
- Built-in `testing` package
- Table-driven tests
- `testify` for assertions

### High-Risk Areas
- Goroutine leaks and race conditions
- Error handling chains
- Interface compliance
- HTTP handler middleware

---

## General (All Stacks)

### Universal QA Priorities
1. Authentication and authorization
2. Data validation and sanitization
3. Error handling and user-facing messages
4. Database changes and migrations
5. API contract changes (breaking changes)
6. Performance-critical paths
7. Third-party service integrations
