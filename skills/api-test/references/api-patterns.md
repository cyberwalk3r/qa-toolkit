# API Test Patterns

## REST API Pattern
```bash
# GET -- List with pagination
curl "${BASE_URL}/api/items?page=1&limit=10" -H "Authorization: Bearer ${TOKEN}"

# GET -- Single item
curl "${BASE_URL}/api/items/1" -H "Authorization: Bearer ${TOKEN}"

# POST -- Create
curl -X POST "${BASE_URL}/api/items" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{"name": "Test", "value": 42}'

# PUT -- Full update
curl -X PUT "${BASE_URL}/api/items/1" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{"name": "Updated", "value": 99}'

# PATCH -- Partial update
curl -X PATCH "${BASE_URL}/api/items/1" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{"name": "Patched"}'

# DELETE
curl -X DELETE "${BASE_URL}/api/items/1" -H "Authorization: Bearer ${TOKEN}"
```

## Common Validation Tests
- Missing required fields -> 400
- Invalid field types (string where number expected) -> 400
- Empty body on POST/PUT -> 400
- ID that doesn't exist -> 404
- No auth header -> 401
- Expired/invalid token -> 401
- Wrong role/permissions -> 403
- Duplicate creation (unique constraint) -> 409

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

# Query with variables
curl -X POST "${BASE_URL}/graphql" \
  -H "Content-Type: application/json" \
  -d '{"query": "query GetUser($id: ID!) { user(id: $id) { id name } }", "variables": {"id": "123"}}'
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

---

## OpenAPI/Swagger Parsing Guidance

When an OpenAPI (v3) or Swagger (v2) spec is available, extract these elements to drive test generation.

### Extraction Targets

| Spec Element | Location (OpenAPI 3.x) | Test Use |
|---|---|---|
| Endpoints | `paths.*` | URL paths for test requests |
| Methods | `paths.{path}.*` (get, post, put, delete, patch) | HTTP method for each test |
| Path params | `paths.{path}.{method}.parameters[?(@.in=='path')]` | URL interpolation (`/users/{id}`) |
| Query params | `paths.{path}.{method}.parameters[?(@.in=='query')]` | Query string construction |
| Header params | `paths.{path}.{method}.parameters[?(@.in=='header')]` | Required headers beyond auth |
| Request body | `paths.{path}.{method}.requestBody.content.'application/json'.schema` | POST/PUT/PATCH payload shape |
| Response schema | `paths.{path}.{method}.responses.{code}.content.'application/json'.schema` | Contract validation assertions |
| Required fields | `schema.required[]` | Required field presence tests |
| Field types | `schema.properties.{field}.type` | Type checking assertions |
| Enums | `schema.properties.{field}.enum` | Enum value validation |
| Nullable | `schema.properties.{field}.nullable` | Null handling tests |
| Security schemes | `components.securitySchemes.*` | Auth test generation |
| Per-endpoint auth | `paths.{path}.{method}.security` | Endpoint-specific auth tests |

### $ref Resolution

Specs use `$ref` to share schemas. Resolution pattern:
- `$ref: '#/components/schemas/User'` -> look up `components.schemas.User`
- Recursively resolve nested `$ref` entries
- Circular references: stop at depth 3, note in test comments

### Swagger v2 Differences

| OpenAPI 3.x | Swagger 2.x |
|---|---|
| `components.schemas.*` | `definitions.*` |
| `requestBody.content.'application/json'.schema` | `parameters[?(@.in=='body')].schema` |
| `responses.{code}.content.'application/json'.schema` | `responses.{code}.schema` |
| `components.securitySchemes` | `securityDefinitions` |

---

## Contract Validation Assertions

Contract tests verify that API responses match the schema declared in an OpenAPI spec. These contract validation checks go beyond status code checks to validate response structure.

### Response Shape Matching

Verify all required fields are present and no unexpected fields appear (when `additionalProperties: false`).

**cURL pattern** (assertion in comments):
```bash
# Contract: GET /api/users/1
curl "${BASE_URL}/api/users/1" -H "Authorization: Bearer ${TOKEN}"
# Expected schema: {id: number, name: string, email: string, role: string(enum: admin|user|guest)}
# Required: id, name, email
# Optional: avatar (string|null), bio (string)
# Verify: all required fields present, types match, role in enum set
```

**Postman pattern** (test script assertions):
```javascript
const schema = {
  type: 'object',
  required: ['id', 'name', 'email'],
  properties: {
    id: { type: 'number' },
    name: { type: 'string' },
    email: { type: 'string', format: 'email' },
    role: { type: 'string', enum: ['admin', 'user', 'guest'] }
  }
};
pm.test('Response matches schema', () => {
  const body = pm.response.json();
  pm.expect(body).to.have.property('id').that.is.a('number');
  pm.expect(body).to.have.property('name').that.is.a('string');
  pm.expect(body).to.have.property('email').that.is.a('string');
  if (body.role) pm.expect(['admin', 'user', 'guest']).to.include(body.role);
});
```

**Playwright pattern** (expect assertions):
```javascript
const body = await response.json();
// Required fields
expect(body).toHaveProperty('id');
expect(body).toHaveProperty('name');
expect(body).toHaveProperty('email');
// Type checks
expect(typeof body.id).toBe('number');
expect(typeof body.name).toBe('string');
expect(typeof body.email).toBe('string');
// Enum validation
if (body.role) expect(['admin', 'user', 'guest']).toContain(body.role);
// Nullable field
if (body.avatar !== undefined) {
  expect(body.avatar === null || typeof body.avatar === 'string').toBe(true);
}
```

### Type Checking Assertions

Map OpenAPI types to runtime checks:

| OpenAPI Type | cURL Comment | Postman Check | Playwright Check |
|---|---|---|---|
| `string` | `field: string` | `.that.is.a('string')` | `typeof field === 'string'` |
| `number` / `integer` | `field: number` | `.that.is.a('number')` | `typeof field === 'number'` |
| `boolean` | `field: boolean` | `.that.is.a('boolean')` | `typeof field === 'boolean'` |
| `array` | `field: array` | `.that.is.an('array')` | `Array.isArray(field)` |
| `object` | `field: object` | `.that.is.an('object')` | `typeof field === 'object'` |

### Enum Validation

When a field has `enum: [val1, val2, val3]`:
```javascript
// Postman
pm.expect(['val1', 'val2', 'val3']).to.include(body.field);

// Playwright
expect(['val1', 'val2', 'val3']).toContain(body.field);
```

Generate negative test: send a value NOT in the enum, expect 400/422.

### Nullable Handling

When schema has `nullable: true`:
```javascript
// Field can be string or null
if (body.field !== null) {
  expect(typeof body.field).toBe('string');
}
```

When schema does NOT have `nullable: true`, assert field is NOT null:
```javascript
expect(body.field).not.toBeNull();
```

### Array Item Validation

When response contains `type: array` with `items` schema:
```javascript
// Verify array and validate each item shape
expect(Array.isArray(body.items)).toBe(true);
for (const item of body.items) {
  expect(item).toHaveProperty('id');
  expect(item).toHaveProperty('name');
  expect(typeof item.id).toBe('number');
  expect(typeof item.name).toBe('string');
}
```

### Nested Object Validation

For nested objects, recurse through the schema:
```javascript
// Top level
expect(body).toHaveProperty('user');
expect(typeof body.user).toBe('object');
// Nested level
expect(body.user).toHaveProperty('id');
expect(body.user).toHaveProperty('address');
expect(typeof body.user.address).toBe('object');
// Deeply nested
expect(body.user.address).toHaveProperty('city');
expect(typeof body.user.address.city).toBe('string');
```

---

## Error Response Schemas

Standard error response formats to validate against.

### RFC 7807 Problem Details

```json
{
  "type": "https://api.example.com/errors/validation",
  "title": "Validation Error",
  "status": 400,
  "detail": "The 'email' field is required.",
  "instance": "/api/users"
}
```

Assertions: `type` is URI string, `title` is string, `status` is number matching HTTP status, `detail` is string.

### Custom Error Object

```json
{
  "error": "VALIDATION_ERROR",
  "message": "Missing required field: email",
  "code": "E001"
}
```

Assertions: `error` is string, `message` is string, `code` is string (if present).

### Validation Error Array

```json
{
  "errors": [
    { "field": "email", "message": "Email is required", "code": "required" },
    { "field": "name", "message": "Name must be at least 2 characters", "code": "minLength" }
  ]
}
```

Assertions: `errors` is array, each item has `field` (string) and `message` (string).

### Expected Status Codes by HTTP Method

| Method | Success | Client Error | Server Error |
|---|---|---|---|
| GET (single) | 200 | 404 (not found), 401, 403 | 500 |
| GET (list) | 200 | 401, 403 | 500 |
| POST (create) | 201 | 400 (validation), 409 (duplicate), 401, 403 | 500 |
| PUT (update) | 200 | 400 (validation), 404 (not found), 401, 403 | 500 |
| PATCH (partial) | 200 | 400 (validation), 404 (not found), 401, 403 | 500 |
| DELETE | 204 (no body) or 200 | 404 (not found), 401, 403 | 500 |

---

## Auth Pattern Templates

### Bearer Token Tests

```bash
# Valid token
curl "${BASE_URL}/api/protected" -H "Authorization: Bearer ${VALID_TOKEN}"
# Expected: 200

# Expired token
curl "${BASE_URL}/api/protected" -H "Authorization: Bearer ${EXPIRED_TOKEN}"
# Expected: 401 with error body indicating token expiration

# Malformed token (not a valid JWT)
curl "${BASE_URL}/api/protected" -H "Authorization: Bearer not-a-real-token"
# Expected: 401

# Missing Authorization header entirely
curl "${BASE_URL}/api/protected"
# Expected: 401

# Wrong scheme (Basic instead of Bearer)
curl "${BASE_URL}/api/protected" -H "Authorization: Basic dXNlcjpwYXNz"
# Expected: 401
```

### API Key Tests

```bash
# Valid API key in header
curl "${BASE_URL}/api/data" -H "X-API-Key: ${VALID_KEY}"
# Expected: 200

# Invalid API key
curl "${BASE_URL}/api/data" -H "X-API-Key: invalid-key-value"
# Expected: 401 or 403

# Missing API key header
curl "${BASE_URL}/api/data"
# Expected: 401

# Wrong header name (x-api-key vs X-API-Key -- case sensitivity check)
curl "${BASE_URL}/api/data" -H "Api-Key: ${VALID_KEY}"
# Expected: 401 (if header name is case-sensitive) or 200 (if not)

# API key in query param (if supported)
curl "${BASE_URL}/api/data?api_key=${VALID_KEY}"
# Expected: 200 (if query param auth supported)
```

### OAuth2 Tests

```bash
# Token exchange (authorization code flow)
curl -X POST "${BASE_URL}/oauth/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code&code=${AUTH_CODE}&redirect_uri=${REDIRECT}&client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}"
# Expected: 200 with {access_token, token_type, expires_in, refresh_token}

# Token refresh
curl -X POST "${BASE_URL}/oauth/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=refresh_token&refresh_token=${REFRESH_TOKEN}&client_id=${CLIENT_ID}"
# Expected: 200 with new access_token

# Scope validation -- request endpoint requiring scope not granted
curl "${BASE_URL}/api/admin" -H "Authorization: Bearer ${USER_SCOPE_TOKEN}"
# Expected: 403 (insufficient scope)

# Invalid client credentials
curl -X POST "${BASE_URL}/oauth/token" \
  -d "grant_type=client_credentials&client_id=invalid&client_secret=invalid"
# Expected: 401
```

### Session-Based Tests

```bash
# With valid session cookie
curl "${BASE_URL}/api/profile" -H "Cookie: session=${SESSION_ID}"
# Expected: 200

# Expired session
curl "${BASE_URL}/api/profile" -H "Cookie: session=${EXPIRED_SESSION}"
# Expected: 401 or redirect to login

# Missing CSRF token on state-changing request
curl -X POST "${BASE_URL}/api/settings" \
  -H "Cookie: session=${SESSION_ID}" \
  -H "Content-Type: application/json" \
  -d '{"theme": "dark"}'
# Expected: 403 (CSRF validation failure)

# With CSRF token
curl -X POST "${BASE_URL}/api/settings" \
  -H "Cookie: session=${SESSION_ID}" \
  -H "X-CSRF-Token: ${CSRF_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"theme": "dark"}'
# Expected: 200
```

---

## Schema Validation by Framework

Framework-specific patterns for deriving expected validation behavior from code conventions.

### Express/Fastify with Zod

When Zod is detected in the project, validation errors follow Zod's format:
```json
{
  "errors": [
    { "code": "invalid_type", "expected": "string", "received": "number", "path": ["email"], "message": "Expected string, received number" }
  ]
}
```

Test pattern: send payload violating each Zod rule, expect 400 with Zod-shaped error.

### Express/Fastify with Joi

When Joi is detected, validation errors follow Joi's format:
```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "\"email\" is required"
}
```

Test pattern: send payload missing each required field, expect 400 with Joi message referencing the field name in quotes.

### Django REST Framework

DRF serializer validation returns:
```json
{
  "email": ["This field is required."],
  "password": ["Ensure this field has at least 8 characters."]
}
```

Test pattern: field-keyed error arrays. Send invalid data per field, expect 400 with field name as key.

### Spring Boot with Bean Validation

Spring validation (JSR 380 annotations) returns:
```json
{
  "timestamp": "2026-03-06T10:00:00.000+00:00",
  "status": 400,
  "error": "Bad Request",
  "errors": [
    { "field": "email", "defaultMessage": "must not be blank", "rejectedValue": "" }
  ]
}
```

Test pattern: violate each annotation constraint (@NotBlank, @Size, @Email, @Min, @Max), expect 400 with `errors[]` containing the field name and constraint message.

### Rails with Strong Parameters / Active Model

Rails API validation returns:
```json
{
  "errors": {
    "email": ["can't be blank", "is invalid"],
    "name": ["is too short (minimum is 2 characters)"]
  }
}
```

Test pattern: field-keyed error arrays similar to DRF. Send missing/invalid fields, expect 422 (Rails convention) with error messages per field.
