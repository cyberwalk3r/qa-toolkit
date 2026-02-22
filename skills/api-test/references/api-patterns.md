# API Test Patterns

## REST API Pattern
```bash
# GET — List with pagination
curl "${BASE_URL}/api/items?page=1&limit=10" -H "Authorization: Bearer ${TOKEN}"

# GET — Single item
curl "${BASE_URL}/api/items/1" -H "Authorization: Bearer ${TOKEN}"

# POST — Create
curl -X POST "${BASE_URL}/api/items" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{"name": "Test", "value": 42}'

# PUT — Full update
curl -X PUT "${BASE_URL}/api/items/1" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{"name": "Updated", "value": 99}'

# PATCH — Partial update
curl -X PATCH "${BASE_URL}/api/items/1" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{"name": "Patched"}'

# DELETE
curl -X DELETE "${BASE_URL}/api/items/1" -H "Authorization: Bearer ${TOKEN}"
```

## Common Validation Tests
- Missing required fields → 400
- Invalid field types (string where number expected) → 400
- Empty body on POST/PUT → 400
- ID that doesn't exist → 404
- No auth header → 401
- Expired/invalid token → 401
- Wrong role/permissions → 403
- Duplicate creation (unique constraint) → 409

## GraphQL Pattern
```bash
# Query
curl -X POST "${BASE_URL}/graphql" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{"query": "{ users { id name email } }"}'

# Mutation
curl -X POST "${BASE_URL}/graphql" \
  -H "Content-Type: application/json" \
  -d '{"query": "mutation { createUser(input: {name: \"Test\"}) { id } }"}'
```

## Postman Collection Format
```json
{
  "info": { "name": "API Tests", "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json" },
  "item": [
    {
      "name": "Test Name",
      "request": {
        "method": "GET",
        "url": "{{baseUrl}}/api/endpoint",
        "header": [{ "key": "Authorization", "value": "Bearer {{token}}" }]
      },
      "event": [{
        "listen": "test",
        "script": { "exec": ["pm.test('Status 200', () => pm.response.to.have.status(200));"] }
      }]
    }
  ]
}
```
