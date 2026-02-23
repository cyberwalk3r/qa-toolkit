---
name: api-test
description: Generate API test suites from plain-English descriptions as cURL, Postman, or Playwright
---

# API Test Builder

Generate API tests from plain-English descriptions. Read `qa-artifacts/.qa-config.json` for project context.

## Input
Accept via `$ARGUMENTS`: endpoint descriptions, API docs references, or workflow descriptions. Examples:
- "Test the user registration API"
- "Test the entire checkout workflow from cart to payment"
- "Verify the search endpoint handles special characters"

## Workflow

1. **Understand the API** — from description, OpenAPI spec (check `qa-artifacts/.qa-config.json` for existing specs), or code
2. **Generate test cases** covering:
   - **Success cases** — valid request, expected response
   - **Validation** — missing fields, invalid types, boundary values
   - **Authentication** — with/without token, expired token, wrong role
   - **Error handling** — 400, 401, 403, 404, 500 responses
   - **Edge cases** — empty body, large payload, special characters, unicode
3. **Choose output format** based on user preference:
   - **cURL commands** (default) — copy-paste ready
   - **Postman collection** — JSON importable
   - **Playwright API test** — JavaScript, ready to run
4. **Chain multi-step workflows** when needed

## Output — cURL (Default)
```bash
# Test: Create user - success
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{"name": "Test User", "email": "test@example.com"}' \
  -w "\nStatus: %{http_code}\n"
# Expected: 201 Created with user object

# Test: Create user - missing email
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name": "Test User"}' \
  -w "\nStatus: %{http_code}\n"
# Expected: 400 Bad Request with validation error
```

## Multi-Step Workflow
For workflows, generate numbered steps with variable passing:
```
Step 1: Create user → capture userId
Step 2: Login as user → capture authToken
Step 3: Perform action using authToken
Step 4: Verify result
Step 5: Cleanup (delete user)
```

For detailed API test patterns, read `references/api-patterns.md`.

## Save
Save to `qa-artifacts/api-tests/api-test-YYYY-MM-DD-<endpoint>.md`

## Suggested Next Steps
After generating API tests, suggest:
- "Generate realistic test payloads with `/qa-toolkit:test-data`."
