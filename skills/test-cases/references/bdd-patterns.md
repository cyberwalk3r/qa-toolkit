# BDD / Gherkin Patterns

## Basic Structure
```gherkin
Feature: <Feature Name>
  As a <role>
  I want <capability>
  So that <benefit>

  Background:
    Given <common precondition>

  Scenario: <Happy path scenario>
    Given <precondition>
    When <action>
    Then <expected result>
    And <additional expectation>

  Scenario: <Negative scenario>
    Given <precondition>
    When <invalid action>
    Then <error handling>

  Scenario Outline: <Parameterized scenario>
    Given <precondition with "<param>">
    When <action>
    Then <result>

    Examples:
      | param   | expected |
      | value1  | result1  |
      | value2  | result2  |
```

## Common Patterns

### Authentication
```gherkin
Scenario: Successful login
  Given I am on the login page
  When I enter valid credentials
  Then I should be redirected to the dashboard
  And I should see a welcome message

Scenario: Failed login with wrong password
  Given I am on the login page
  When I enter a valid email and wrong password
  Then I should see an error message "Invalid credentials"
  And I should remain on the login page
```

### CRUD Operations
```gherkin
Scenario: Create a new item
  Given I am logged in as an authorized user
  When I fill in the required fields
  And I submit the form
  Then the item should be created
  And I should see a success notification

Scenario: Delete with confirmation
  Given I have an existing item
  When I click delete
  Then I should see a confirmation dialog
  When I confirm deletion
  Then the item should be removed
```

### Form Validation
```gherkin
Scenario Outline: Form validation
  Given I am on the registration form
  When I enter "<field>" as "<value>"
  And I submit the form
  Then I should see "<error>"

  Examples:
    | field    | value    | error                    |
    | email    |          | Email is required        |
    | email    | invalid  | Please enter valid email |
    | password | 123      | Minimum 8 characters     |
```
