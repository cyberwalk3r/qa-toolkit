# BDD / Gherkin Patterns for State-Aware Test Cases

Non-obvious patterns for integrating traceability IDs, risk annotations, and state-derived context into Gherkin output. Basic Given/When/Then syntax is not covered here.

## Traceability Tags

Every Scenario gets a `@TC-FEATURE-NN` tag matching the traceability ID, plus priority and dimension tags:

```gherkin
@TC-LOGIN-01 @P0 @happy-path
Scenario: Valid login with correct credentials
  Given I have a valid user account
  When I enter my credentials and submit
  Then I should see the dashboard
```

Tag conventions:
- `@TC-{FEATURE}-{NN}` -- traceability ID (always first tag)
- `@P0` through `@P3` -- priority level
- `@happy-path`, `@negative`, `@boundary`, `@edge`, `@security`, `@performance` -- dimension
- `@risk-{area}` -- added when test targets a known risk area

## Risk Annotations in Gherkin

Risk annotations appear as comments above the Scenario, not inline with steps:

```gherkin
# RISK: targets known risk area -- auth module (3 occurrences, last seen 2026-03-01)
# Priority escalated to P0 due to risk area targeting
@TC-LOGIN-05 @P0 @security @risk-auth
Scenario: SQL injection attempt in login form
  Given I am on the login page
  When I enter "' OR 1=1 --" in the email field
  And I submit the form
  Then I should see "Invalid credentials"
  And no database query should be exposed
```

## Background Block for State-Derived Preconditions

When project state provides common preconditions (e.g., app URL, auth requirements, environment), use Background:

```gherkin
Feature: Shopping Cart

  # Preconditions derived from project state:
  # - App uses session-based auth (from conventions)
  # - Cart requires authenticated user (from requirement)
  Background:
    Given I am logged in as a registered user
    And I have an empty shopping cart

  @TC-CART-01 @P0 @happy-path
  Scenario: Add single item to cart
    When I click "Add to Cart" on a product
    Then the cart count should show 1
```

Only include state-derived preconditions that apply to ALL scenarios in the feature. Scenario-specific preconditions stay in individual Given steps.

## Scenario Outline for Boundary and Parameterized Cases

Use Scenario Outline when generating boundary or data-driven test cases. Populate Examples from state-aware context:

```gherkin
@TC-LOGIN-06 @TC-LOGIN-07 @TC-LOGIN-08 @P1 @boundary
Scenario Outline: Password length validation
  Given I am on the registration page
  When I enter a password of length <length>
  And I submit the form
  Then I should see "<result>"

  Examples:
    | length | result                    | note                    |
    | 0      | Password is required      | empty boundary          |
    | 7      | Minimum 8 characters      | below minimum           |
    | 8      | Password accepted         | at minimum boundary     |
    | 128    | Password accepted         | at maximum boundary     |
    | 129    | Password too long         | above maximum           |
```

Each row in Examples gets its own traceability ID (tag all IDs on the Scenario Outline).

## Domain Patterns

### Authentication
- Background: user account exists with known credentials
- Happy path: valid login, session created, redirect to target
- Negative: wrong password, locked account, expired token
- Security: injection, brute force (use Scenario Outline for multiple injection payloads)

### CRUD Operations
- Background: authenticated user with appropriate role
- Happy path: create/read/update/delete with valid data
- Negative: missing required fields, duplicate entries, unauthorized role
- Boundary: max field lengths, special characters in text fields

### Form Validation
- Use Scenario Outline with Examples table for field/value/error combinations
- Include boundary values derived from any known validation rules in project state
- Tag each validation rule with its own traceability ID
