# Domain-Specific Test Data Patterns

## E-Commerce
- **Users**: varied roles (guest, registered, premium, admin), different locales
- **Products**: zero price, max price, negative price, long names, special chars in descriptions
- **Orders**: empty cart, single item, max items, partial fulfillment, cancelled, refunded
- **Payments**: valid cards, expired cards, insufficient funds, declined, 3DS required
- **Addresses**: PO boxes, international, multi-line, very long, missing fields

## Healthcare (HIPAA-Safe)
- **Patients**: use generated names (never real), MRN format variations, DOB edge cases
- **Records**: empty history, extensive history, multiple providers, concurrent visits
- **Medications**: drug interactions, allergies, dosage boundaries
- **Appointments**: overlapping times, timezone crossing, past dates, far future

## Fintech
- **Accounts**: zero balance, negative balance, max int, micro amounts (0.001)
- **Transactions**: concurrent transactions, round-number amounts, cross-currency
- **Compliance**: KYC data variations, document types, sanction list patterns
- **Dates**: end-of-month, leap year, timezone boundaries, DST transitions

## SaaS / Multi-Tenant
- **Organizations**: single user, max users, suspended, trial expired, plan limits
- **Users**: owner, admin, member, guest, deactivated, invited-not-accepted
- **Data**: cross-tenant isolation test data, shared resources
- **Billing**: free tier, paid tier, upgraded, downgraded, past-due

## Common Edge Case Values
```json
{
  "empty_string": "",
  "whitespace_only": "   ",
  "unicode": "漢字テスト🎉",
  "rtl_text": "مرحبا",
  "max_length_255": "a]repeated 255 times[",
  "sql_injection": "'; DROP TABLE users; --",
  "xss_attempt": "<script>alert('xss')</script>",
  "html_entities": "&lt;b&gt;bold&lt;/b&gt;",
  "null_byte": "test\u0000value",
  "very_long_email": "a]repeated 64[b@c]repeated 255[.com",
  "negative_number": -1,
  "zero": 0,
  "max_int": 2147483647,
  "float_precision": 0.1 + 0.2,
  "future_date": "2099-12-31",
  "epoch_zero": "1970-01-01T00:00:00Z"
}
```
