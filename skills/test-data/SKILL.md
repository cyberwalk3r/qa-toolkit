---
name: test-data
description: Generate realistic, privacy-safe synthetic test data as JSON, CSV, or SQL
---

# Test Data Generator

Generate synthetic test data. Read `qa-artifacts/.qa-config.json` for project context.

## Input
Accept via `$ARGUMENTS`: description of what data is needed. Examples:
- "Generate 20 test users with varied roles, names, and email formats"
- "Create sample order data with different statuses and edge cases"
- "I need healthcare patient records for testing — HIPAA-safe fake data"

## Workflow

1. **Understand the data model** from the description or project context
2. **Generate data** with variety:
   - Normal values (80%)
   - Edge cases (15%): empty strings, max length, special characters, unicode
   - Boundary values (5%): 0, negative, MAX_INT, very long strings
3. **Ensure privacy safety** — never use real PII; generate realistic but fake data
4. **Output in requested format** (default: JSON)

## Data Dimensions
- **Names**: multicultural, varied lengths, special characters (O'Brien, José, 田中)
- **Emails**: valid, edge cases (plus addressing, long domains, unicode)
- **Dates**: past, future, timezone edge cases, leap years, epoch boundaries
- **Numbers**: zero, negative, decimal precision, very large
- **Addresses**: international formats, multi-line, special postal codes
- **Strings**: empty, whitespace-only, max-length, HTML/script injection strings

## Output Formats

**JSON** (default):
```json
[
  { "id": 1, "name": "Alice Johnson", "email": "alice@example.com", ... },
  { "id": 2, "name": "田中太郎", "email": "tanaka+test@example.co.jp", ... }
]
```

**CSV**: Comma-separated with header row
**SQL INSERT**: Ready-to-execute INSERT statements with proper escaping

For domain-specific data patterns, read `references/domain-data.md`.

## Save
Save to `qa-artifacts/test-data/data-YYYY-MM-DD-<description>.json` (or .csv / .sql)
