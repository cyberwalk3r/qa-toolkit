---
name: api-test
description: Generate state-aware API test suites with contract validation from OpenAPI/Swagger specs as cURL, Postman, or Playwright.
---

# API Test Builder

Generate API tests from plain-English descriptions, OpenAPI/Swagger specs, or code inspection. Reads project and session state to produce tests grounded in the actual API framework, detected auth patterns, and prior session findings. Supports contract validation when an OpenAPI spec is available, generating schema assertions that verify response shape, types, and required fields.

## Input

Accept via `$ARGUMENTS`: endpoint descriptions, API docs references, OpenAPI spec paths, or workflow descriptions. Examples:
- "Test the user registration API"
- "Test the entire checkout workflow from cart to payment"
- "Verify the search endpoint handles special characters"
- "Generate contract tests from our OpenAPI spec at docs/api.yaml"
- "Test the payment API endpoints with schema validation"
- "Generate API tests for endpoints flagged in coverage-gap analysis"

Derive from input:
- **Endpoint scope** -- which endpoints or API areas to test
- **Spec source** -- OpenAPI/Swagger file path if provided or detectable in project
- **Output format** -- cURL (default), Postman, or Playwright (from user preference or `$ARGUMENTS`)

No format flags required -- cURL is default. User can request Postman or Playwright explicitly.

## Workflow

### Step 1: Read State

Read `shared/references/state-integration.md` for the full state reading pattern.

Execute state reading commands:

```bash
PROJECT_STATE=$(node scripts/state-manager.js read project)
SESSION_STATE=$(node scripts/state-manager.js read session)
DETECTION=$(node scripts/state-manager.js read project detection)
RISKS=$(node scripts/state-manager.js read project risks)
COVERAGE_GAPS=$(node scripts/state-manager.js read project coverageGaps)
SKILL_HISTORY=$(node scripts/state-manager.js read session skillHistory)
FINDINGS=$(node scripts/state-manager.js read session findings)
```

Extract from project state:
- `detection.frameworks` -- identify API framework (Express, Fastify, NestJS, Django, Django REST, Flask, Spring Boot, Rails, etc.)
- `detection.languages` -- for language-appropriate test code generation
- `detection.testFrameworks` -- for Playwright availability check
- `risks[]` -- for risk-weighted test prioritization
- `coverageGaps[]` -- for endpoint priority escalation

Extract from session state:
- `skillHistory[]` -- check for `coverage-gap` findings (prioritize endpoints with gaps) and `pr-review` findings (focus on changed endpoints)
- `findings[]` -- cross-reference prior skill findings for endpoint targeting

If no state available (cold start), use defaults per `shared/references/cold-start-pattern.md`. Every conditional below has a fallback.

Load `shared/references/output-formats.md` for multi-platform format support.
Load `shared/references/artifact-organization.md` for context-based save paths.

### Step 2: Understand the API

From the user's description, OpenAPI spec, or code inspection:

1. Identify endpoints: URL paths, HTTP methods, expected parameters
2. Identify authentication: bearer token, API key, OAuth2, session/cookie
3. Identify request/response schemas: field names, types, required vs optional

**When OpenAPI/Swagger spec is provided or detected in project:**

Parse the spec to extract structured endpoint data. Reference `references/api-patterns.md` "OpenAPI/Swagger Parsing Guidance" section for extraction patterns:
- Paths (endpoint URLs) and methods (GET/POST/PUT/DELETE/PATCH)
- Parameters (path, query, header, body) with types and required flags
- Request body schemas (required fields, types, formats, nested objects)
- Response schemas per status code (200, 201, 400, 401, 404, 500)
- Security schemes (bearer, apiKey, oauth2) and per-endpoint auth requirements
- Resolve `$ref` references for shared schema components

**When no spec available:**
Derive endpoint structure from user description and code inspection. Generate tests with reasonable assumed schemas noted in comments.

### Step 3: Check Prior Output

Check session `skillHistory` for prior `api-test` invocations:

- If prior invocation found for **same endpoints**: add note at top of output: "Note: API tests for {endpoint/scope} were already generated this session ({N} tests). Generating fresh set -- review for overlap with prior version."
- If `coverage-gap` findings exist in session: highlight which requested endpoints appear in coverage gap results and prioritize those.
- If `pr-review` findings exist in session: note which endpoints were flagged in PR review and include targeted tests for those.
- If no prior invocation: continue without note.

Always generate full output regardless of prior invocations.

### Step 4: Generate Test Cases

Generate test cases covering ALL categories. Reference `references/api-patterns.md` for patterns and templates.

**Standard categories** (always generated):
- **Success cases** -- valid request with expected response, correct status codes
- **Validation** -- missing required fields, invalid types, boundary values, empty strings
- **Authentication** -- with/without token, expired token, wrong role, malformed header
- **Error handling** -- 400, 401, 403, 404, 409, 500 responses with error body validation
- **Edge cases** -- empty body, large payload, special characters, unicode, concurrent requests

**Contract validation** (when OpenAPI/Swagger spec is available):
- **Response shape matching** -- all required fields present in response body
- **Type checking** -- string/number/boolean/array/object match spec types
- **Required field presence** -- every field marked `required` in spec exists in response
- **Enum validation** -- field values are within the spec's allowed enum set
- **Nullable handling** -- null values only appear where schema allows `nullable: true`
- **Array item validation** -- each item in array responses matches the `items` schema
- **Nested object validation** -- recursive shape checking for nested response objects

Reference `references/api-patterns.md` "Contract Validation Assertions" section for assertion patterns per output format. Reference "Error Response Schemas" section for expected error body shapes.

### Step 5: Choose Output Format

Based on user preference (default: cURL):

**cURL commands** (default) -- copy-paste ready with schema expectations in comments:
```bash
# Test: Create user - success (contract: verify response shape)
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{"name": "Test User", "email": "test@example.com"}' \
  -w "\nStatus: %{http_code}\n"
# Expected: 201 Created
# Schema: {"id": number, "name": string, "email": string, "createdAt": string(date-time)}
# Required fields: id, name, email
# Verify: response contains all required fields with correct types

# Test: Create user - missing email (contract: verify error shape)
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name": "Test User"}' \
  -w "\nStatus: %{http_code}\n"
# Expected: 400 Bad Request
# Error schema: {"error": string, "message": string, "details": [{"field": "email", "message": string}]}
```

**Postman collection** -- JSON importable with schema validation test scripts:
```json
{
  "info": { "name": "API Tests", "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json" },
  "item": [
    {
      "name": "Create user - success + contract",
      "request": {
        "method": "POST",
        "url": "{{baseUrl}}/api/users",
        "header": [{ "key": "Authorization", "value": "Bearer {{token}}" }],
        "body": { "mode": "raw", "raw": "{\"name\": \"Test\", \"email\": \"test@example.com\"}" }
      },
      "event": [{
        "listen": "test",
        "script": { "exec": [
          "pm.test('Status 201', () => pm.response.to.have.status(201));",
          "const body = pm.response.json();",
          "pm.test('Has required fields', () => { pm.expect(body).to.have.property('id'); pm.expect(body).to.have.property('name'); pm.expect(body).to.have.property('email'); });",
          "pm.test('Field types', () => { pm.expect(body.id).to.be.a('number'); pm.expect(body.name).to.be.a('string'); pm.expect(body.email).to.be.a('string'); });"
        ]}
      }]
    }
  ]
}
```

**Playwright API test** -- JavaScript, ready to run with expect assertions for response shape:
```javascript
const { test, expect } = require('@playwright/test');

test('Create user - success + contract', async ({ request }) => {
  const response = await request.post('/api/users', {
    data: { name: 'Test User', email: 'test@example.com' },
    headers: { Authorization: `Bearer ${process.env.TOKEN}` }
  });
  expect(response.status()).toBe(201);
  const body = await response.json();
  // Contract validation
  expect(body).toHaveProperty('id');
  expect(body).toHaveProperty('name');
  expect(body).toHaveProperty('email');
  expect(typeof body.id).toBe('number');
  expect(typeof body.name).toBe('string');
});
```

### Step 6: Chain Multi-Step Workflows

For workflows, generate numbered steps with variable passing:
```
Step 1: Create user -> capture userId
Step 2: Login as user -> capture authToken
Step 3: Perform action using authToken
Step 4: Verify result
Step 5: Cleanup (delete user)
```

**State-aware workflow suggestions:**
- If `coverage-gap` findings mention auth flows: suggest auth lifecycle workflow (register -> login -> access -> refresh -> logout)
- If `pr-review` findings mention new endpoints: suggest CRUD lifecycle workflow for those endpoints
- If `risks[]` mention data integrity: suggest transaction workflow (create -> modify -> verify -> rollback)

For detailed multi-step and workflow patterns, read `references/api-patterns.md`.

### Step 7: Format Output

Read `shared/references/context-preamble.md` and generate the context preamble.

**Context preamble "Why" line:**

When state is available:
```
> **Why these tests:** {API framework} detected -- includes framework-specific validation patterns.
> Auth pattern: {auth type from detection or spec}. {N} endpoints tested with {M} contract assertions.
> Prior session: {coverage-gap/pr-review findings summary if available}.
```

When cold start:
```
> **Project Context**
> Stack: Not detected | Test Framework: Not detected
>
> **Why these tests:** Standard API test coverage across 5 categories. Run `/qa-setup` or start a new session for stack-tailored output with contract validation.
```

### Step 8: Write Session State

After generating output, write execution summary to session state:

```bash
node scripts/state-manager.js write session skillHistory '{
  "skill": "api-test",
  "feature": "<endpoint-or-scope>",
  "timestamp": "<ISO-8601>",
  "endpointCount": <number>,
  "testCount": <number>,
  "byCategory": {
    "success": <n>,
    "validation": <n>,
    "auth": <n>,
    "error": <n>,
    "edge": <n>,
    "contract": <n>
  },
  "format": "<cURL|postman|playwright>",
  "hasContractTests": <true|false>
}'

node scripts/state-manager.js merge session findings '{
  "area": "<endpoint-or-scope>",
  "type": "api-test",
  "summary": "API tests generated: <N> endpoints, <M> tests (<K> contract), format: <format>"
}'
```

### Step 9: Save

Save to `qa-artifacts/api-tests/api-test-YYYY-MM-DD-<endpoint>.md`

Format from `shared/references/output-formats.md` applies to documentation headers only, not generated test code.
Use context-based save path per `shared/references/artifact-organization.md`.

## Output Section Order

1. **Context preamble** -- blockquote with project context and "Why these tests" line
2. **Prior output note** -- if applicable (Step 3)
3. **API Test Suite** -- organized by endpoint, then by category (success, validation, auth, error, edge)
4. **Contract Validation Tests** -- separate section when OpenAPI spec available, grouped by endpoint with schema assertions
5. **Multi-Step Workflows** -- chained test sequences when applicable
6. **Coverage Summary** -- test counts by category, contract test counts
7. **Suggested Next Steps**

## Suggested Next Steps

After generating API tests, suggest based on session state:
- "Run `/qa-toolkit:coverage-gap` to check if other API endpoints need testing." (when no `coverage-gap` in session skillHistory)
- "API test coverage from this session is available for test planning." (when findings written to session state)
- "Generate realistic test payloads with `/qa-toolkit:test-data` for edge case testing." (always)
- "Run `/qa-toolkit:risk-prioritization` on API endpoints with high error rates." (when risks detected in tested endpoints)
