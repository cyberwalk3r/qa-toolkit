---
name: test-data
description: Generate realistic, privacy-safe synthetic test data with schema-aware field generation for JSON, CSV, or SQL output. Use this skill whenever a user needs fake data for testing, asks for test fixtures, wants to seed a database, or needs data matching specific models — especially when they mention HIPAA/PII-safe requirements, specific record counts, or existing schema files.
---

# Test Data Generator

Generate synthetic test data grounded in project context. Reads project and session state to detect data models (Prisma, TypeORM, Mongoose), conform to schema constraints, and generate data matching prior test scenario needs. Supports JSON, CSV, and SQL output formats with configurable edge case distribution.

## Input

Accept via `$ARGUMENTS`: description of what data is needed. Examples:
- "Generate 20 test users with varied roles, names, and email formats"
- "Create sample order data with different statuses and edge cases"
- "I need healthcare patient records for testing -- HIPAA-safe fake data"
- "Generate test data matching the User model from our Prisma schema"
- "Create order data for the scenarios in my last test-cases run"
- "50 rows of product data as CSV for import testing"

Derive from input:
- **Data model** -- entity name(s) and fields to generate
- **Record count** -- explicit count or reasonable default (20)
- **Output format** -- JSON (default), CSV, or SQL
- **Description label** -- used for save path and state writing

## Workflow

### Step 1: Read State

Read `shared/references/state-integration.md` for the full state reading pattern.

Execute state reading commands:

```bash
PROJECT_STATE=$(node scripts/state-manager.js read project)
SESSION_STATE=$(node scripts/state-manager.js read session)
DETECTION=$(node scripts/state-manager.js read project detection)
RISKS=$(node scripts/state-manager.js read project risks)
CONVENTIONS=$(node scripts/state-manager.js read project testingConventions)
SKILL_HISTORY=$(node scripts/state-manager.js read session skillHistory)
FEATURE=$(node scripts/state-manager.js read session featureUnderTest)
FINDINGS=$(node scripts/state-manager.js read session findings)
```

Extract from project state:
- `detection.languages` -- for language-appropriate data formats (e.g., TypeScript interfaces vs Python dataclasses)
- `detection.frameworks` -- for schema detection (Prisma, TypeORM, Mongoose, Sequelize, Django ORM, SQLAlchemy)
- `testingConventions[]` -- for fixture format preferences

Extract from session state:
- `featureUnderTest` -- for data model scope focus
- `skillHistory[]` -- for prior test-data runs and test-cases output (generate data matching test scenario needs)
- `findings[]` -- for cross-referencing prior skill findings

If no state available (cold start), use defaults per `shared/references/cold-start-pattern.md`. Every conditional below has a fallback.

Load `shared/references/output-formats.md` for multi-platform format support.
Load `shared/references/artifact-organization.md` for context-based save paths.

### Step 2: Parse Input

From `$ARGUMENTS`, understand:
- **Data model** -- entity structure from description, project schema files, or prior test-cases output
- **Field requirements** -- specific fields mentioned, types, constraints
- **Record count** -- explicit number or default to 20
- **Output format** -- JSON (default), CSV, or SQL; detect from user request or file extension hint

Check if project state has detected schema/model info:
- If Prisma detected: look for `prisma/schema.prisma` to extract model definitions
- If TypeORM detected: look for entity decorators in source files
- If Mongoose detected: look for Schema definitions
- Use detected schema to auto-populate field names, types, constraints, and relationships

Derive description label for save path:
1. Explicit description from user input (preferred)
2. Entity/model name from schema (if detected)
3. Session state `featureUnderTest` (fallback)

Normalize: lowercase, hyphens only (e.g., "User Authentication Data" -> "user-authentication").

### Step 3: Check Prior Output

Check session `skillHistory` for prior invocations:

- **Prior test-data runs** for same model: add note: "Note: Test data for {model} was already generated this session. Generating fresh set -- review for overlap."
- **Prior test-cases runs**: extract test scenario needs to inform data generation. If test-cases generated scenarios requiring specific data states (e.g., "expired subscription", "admin user with no permissions"), generate data matching those states.

Always generate full output regardless of prior invocations.

### Step 4: Generate Data

Generate data with variety distribution:
- **Normal values (80%)** -- realistic, representative data
- **Edge cases (15%)** -- empty strings, max length, special characters, unicode
- **Boundary values (5%)** -- 0, negative, MAX_INT, very long strings

Reference `references/data-strategies.md` for:
- Schema-aware generation (conforming to detected model constraints)
- Relationship-aware data (foreign keys, parent-child hierarchies)
- Edge case injection strategy by field type

Reference `references/domain-data.md` for domain-specific patterns:
- E-commerce, healthcare, fintech, SaaS data patterns
- Common edge case values

When schema detected in project state:
- Generate data conforming to model constraints (field types, required fields, enums, defaults)
- Respect unique constraints (no duplicate emails if `@unique`)
- Generate related records in correct order (parent before child for FK constraints)
- Include nullable fields as null in some records (edge case coverage)

**Ensure privacy safety** -- never use real PII; generate realistic but fake data.

### Step 5: Format Output

Read `shared/references/context-preamble.md` and generate the context preamble.

**Context preamble "Why" line:**

When state is available:
```
> **Why this data:** {framework/ORM} detected -- data conforms to {model} schema constraints.
> {N} fields with {constraints} applied. Edge case rate: 20% (15% edge + 5% boundary).
```

When cold start:
```
> **Project Context**
> Stack: Not detected | Test Framework: Not detected
>
> **Why this data:** Generated from input description with standard variety distribution. Run `/qa-setup` or start a new session for schema-aware generation.
```

Include the generated data in requested format.

## Data Dimensions

- **Names**: multicultural, varied lengths, special characters (O'Brien, Jose, Tanaka Taro)
- **Emails**: valid, edge cases (plus addressing, long domains, unicode)
- **Dates**: past, future, timezone edge cases, leap years, epoch boundaries
- **Numbers**: zero, negative, decimal precision, very large
- **Addresses**: international formats, multi-line, special postal codes
- **Strings**: empty, whitespace-only, max-length, HTML/script injection strings

For domain-specific data patterns, read `references/domain-data.md`.

## Output Formats

**JSON** (default):
```json
[
  { "id": 1, "name": "Alice Johnson", "email": "alice@example.com", "role": "admin" },
  { "id": 2, "name": "Tanaka Taro", "email": "tanaka+test@example.co.jp", "role": "user" }
]
```

**CSV**: Comma-separated with header row, UTF-8-BOM encoding for Excel compatibility, proper quoting for values containing commas or newlines.

**SQL INSERT**: Ready-to-execute INSERT statements with proper escaping, transaction wrapping, and correct INSERT order for foreign key constraints.

For format-specific considerations (nested JSON, CSV encoding, SQL transaction safety), read `references/data-strategies.md`.

## Output Sections

1. **Context preamble** -- blockquote with project context and "Why this data" line
2. **Prior output note** -- if applicable (Step 3)
3. **Generated Data** -- in requested format
4. **Data Summary** -- record count, format, edge case breakdown, schema conformance notes
5. **Cold-start footer** -- if applicable, per `shared/references/cold-start-pattern.md`
6. **Suggested Next Steps**

### Step 6: Write Session State

After generating output, write execution summary to session state:

```bash
node scripts/state-manager.js write session skillHistory '{
  "skill": "test-data",
  "feature": "<description>",
  "timestamp": "<ISO-8601>",
  "recordCount": <count>,
  "format": "<json|csv|sql>",
  "dataModel": "<entity-name>",
  "edgeCaseRate": 0.20,
  "fieldsGenerated": ["<field1>", "<field2>"],
  "schemaDetected": <true|false>
}'

node scripts/state-manager.js merge session findings '{
  "area": "<description>",
  "type": "test-data",
  "summary": "Test data generated: <N> records as <format>, <model> model, <edge%> edge cases"
}'
```

## Save

Save to `qa-artifacts/test-data/data-YYYY-MM-DD-<description>.json` (or `.csv` / `.sql`)

Format from `shared/references/output-formats.md` applies to documentation headers only, not generated data.
Use context-based save path per `shared/references/artifact-organization.md`.

## Suggested Next Steps

After generating test data, suggest based on what was produced:
- "Run `/qa-toolkit:test-cases` to use this data in test scenarios." (always)
- "Run `/qa-toolkit:e2e-test` to use this data as fixture data." (when E2E framework detected in state)
- "Run `/qa-toolkit:api-test` to use this data in API request payloads." (when API framework detected in state)
- "Generated data profile available in session for downstream skills." (when findings written to state)
