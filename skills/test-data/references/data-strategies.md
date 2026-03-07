# Data Generation Strategies

Schema-aware generation, relationship patterns, edge case injection, and format-specific considerations for test data generation.

## Schema-Aware Generation

When the project state detects an ORM or schema library, extract model definitions to generate conforming data.

### Prisma Schema

Parse `prisma/schema.prisma` for model definitions:

```prisma
model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  name      String?
  role      Role     @default(USER)
  posts     Post[]
  createdAt DateTime @default(now())
}
```

**Extraction rules:**
- `@id` -- generate unique sequential or UUID values
- `@unique` -- ensure no duplicates across generated records
- `@default(...)` -- include default value in some records, override in others
- `@relation` -- generate referenced records first (see Relationship-Aware Data)
- `String?` (optional) -- include `null` in ~10% of records for edge coverage
- `enum` types -- cycle through all enum values with realistic distribution
- `DateTime` -- generate realistic timestamps with edge cases (epoch, far future)
- `Int`/`Float` -- include 0, negative (if business logic allows), large values in edge cases
- `Boolean` -- roughly 50/50 distribution with explicit `false` (not just omitted)

### TypeORM Entities

Parse entity files for Column decorators:

```typescript
@Entity()
class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 255 })
  email: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.USER })
  role: UserRole;

  @Column({ nullable: true })
  bio: string | null;
}
```

**Extraction rules:**
- `@PrimaryGeneratedColumn('uuid')` -- generate valid UUIDs
- `@Column({ unique: true })` -- ensure uniqueness
- `@Column({ length: N })` -- respect max length, include boundary (N-1, N, N+1 for edge)
- `@Column({ type: 'enum' })` -- cycle through enum values
- `@Column({ nullable: true })` -- include null in edge cases
- `@Column({ type: 'decimal', precision: 10, scale: 2 })` -- generate appropriate decimal values

### Mongoose Schemas

Parse schema definitions:

```javascript
const userSchema = new Schema({
  email: { type: String, required: true, unique: true },
  name: { type: String, minlength: 2, maxlength: 100 },
  age: { type: Number, min: 0, max: 150 },
  role: { type: String, enum: ['user', 'admin', 'moderator'] },
  profile: { type: Schema.Types.ObjectId, ref: 'Profile' }
});
```

**Extraction rules:**
- `required: true` -- always include field
- `unique: true` -- ensure no duplicates
- `minlength`/`maxlength` -- respect bounds, include boundary values in edge cases
- `min`/`max` -- respect numeric bounds, include boundary values
- `enum` -- cycle through allowed values
- `ref` -- generate referenced document first (see Relationship-Aware Data)
- `Schema.Types.ObjectId` -- generate valid 24-character hex strings

---

## Relationship-Aware Data

When generating data for models with relationships, order matters for referential integrity.

### Foreign Key Chains

Generate records in dependency order:

```
1. Independent entities first (no foreign keys): Country, Category, Role
2. First-level dependents: User (references Role), Product (references Category)
3. Second-level dependents: Order (references User), Review (references User + Product)
4. Junction tables last: OrderItem (references Order + Product)
```

**Rules:**
- Every foreign key value must reference an existing record
- Distribute references realistically (not all orders from one user)
- Include orphan-candidate edge cases only if testing cascade behavior
- For self-referential relationships (tree structures), generate root nodes first

### Parent-Child Hierarchies

For tree structures (categories, org charts, file systems):

```
Depth 0: 2-3 root nodes (parent_id = null)
Depth 1: 3-5 children per root
Depth 2: 1-3 children per depth-1 node
Edge cases: leaf node (no children), single-child parent, max-depth node
```

### Many-to-Many with Junction Tables

Generate both sides independently, then junction records:

```
1. Generate Users (10 records)
2. Generate Projects (5 records)
3. Generate UserProject junction records:
   - Each user in 1-3 projects
   - Each project has 2-5 users
   - Include edge: user in no projects, project with single user
```

---

## Edge Case Injection Strategy

Inject edge cases by field type. Target distribution: 80% normal, 15% edge, 5% boundary.

### By Field Type

**Strings:**
- Edge (15%): empty string `""`, whitespace-only `"   "`, unicode `"Tanaka Taro"`, RTL text, emoji, HTML entities
- Boundary (5%): max length (exactly at limit), max+1 (if testing validation), null byte `\0`, SQL injection `'; DROP TABLE users; --`, XSS `<script>alert(1)</script>`

**Numbers (integers):**
- Edge (15%): 0, -1, negative values, large values (999999)
- Boundary (5%): `MAX_SAFE_INTEGER` (2^53-1), `MIN_SAFE_INTEGER`, max for column type (INT: 2147483647, BIGINT: 9223372036854775807)

**Numbers (decimals/floats):**
- Edge (15%): 0.0, -0.01, very small (0.001), many decimal places (0.123456789)
- Boundary (5%): precision limit for column type, `0.1 + 0.2` representation issues

**Dates:**
- Edge (15%): epoch (1970-01-01), far future (2099-12-31), leap year (2024-02-29), DST transition dates
- Boundary (5%): year 0, year 9999, month boundaries (Jan 31 -> Feb 1), timezone midnight

**Booleans:**
- Edge: explicit `false` (not omitted), `null` (if nullable)
- Boundary: truthy/falsy edge values only relevant for loosely-typed contexts (`0`, `""`, `undefined`)

**Arrays/Collections:**
- Edge (15%): empty array `[]`, single element, duplicate elements
- Boundary (5%): very large array (100+ items), nested arrays, mixed types (if schema allows)

**Enums:**
- Include every enum value at least once
- Weight toward realistic distribution (e.g., 70% "active", 15% "pending", 10% "suspended", 5% "deleted")

---

## Format-Specific Considerations

### JSON

- **Nested objects** preserve relationships (embed child in parent or use ID references based on use case)
- **Arrays** for collections (orders containing items as nested array)
- **null vs missing keys** -- include both patterns for edge coverage:
  - `"bio": null` (explicit null)
  - key omitted entirely (field not present)
- **Number precision** -- use strings for currency/decimal when precision matters (`"price": "19.99"` not `"price": 19.990000000000002`)
- **Date format** -- ISO-8601 strings (`"2025-01-15T10:30:00Z"`) unless schema specifies otherwise

### CSV

- **Header row** always included as first row
- **Encoding** -- UTF-8 with BOM (`\xEF\xBB\xBF`) for Excel compatibility
- **Quoting rules** -- double-quote fields containing: commas, newlines, double-quotes (escaped as `""`)
- **Null representation** -- empty field (not literal "null" string) unless explicitly requested
- **Nested data** -- flatten relationships (repeat parent fields per child row, or use separate CSV files)
- **Line endings** -- `\r\n` for maximum compatibility

### SQL INSERT

- **Transaction wrapping** -- wrap all INSERTs in `BEGIN`/`COMMIT` for atomicity
- **INSERT order** -- respect foreign key constraints (parent tables first)
- **Schema-qualified names** -- use `schema.table` when multiple schemas possible
- **Value escaping** -- single quotes escaped as `''`, no string interpolation
- **Parameterized patterns** -- include comment showing parameterized version alongside literal SQL
- **NULL handling** -- use SQL `NULL` keyword, not quoted `'NULL'` string
- **Batch size** -- split into batches of 100 for large datasets (avoid max query length limits)
- **Multi-dialect awareness** -- note syntax differences:
  - PostgreSQL: `INSERT INTO ... RETURNING id`
  - MySQL: `INSERT INTO ... VALUES (...), (...), (...)` (multi-row)
  - SQLite: no `RETURNING` clause, `INSERT OR IGNORE` for upserts
