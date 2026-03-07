# Playwright Patterns Reference

Advanced patterns for convention-grounded E2E test generation. Generic Playwright API knowledge is assumed -- this file covers non-obvious patterns and project-matching guidance.

## Fixture Integration with test.extend

When convention scan detects `fixturePattern: "custom"`, generate tests using `test.extend<>` instead of bare `{ page }`.

### Detecting Existing Fixtures

Look for a `fixtures.ts` or `fixtures.js` file in:
- Root test directory (e.g., `tests/fixtures.ts`)
- Alongside test files in the same directory
- Imported in existing test files (trace the import path)

If found, import from the existing file. If not, scaffold a new one.

### Fixture Pattern (TypeScript)

```typescript
// fixtures.ts
import { test as base } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';

type Fixtures = {
  loginPage: LoginPage;
  dashboardPage: DashboardPage;
};

export const test = base.extend<Fixtures>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  dashboardPage: async ({ page }, use) => {
    await use(new DashboardPage(page));
  },
});

export { expect } from '@playwright/test';
```

```typescript
// login.spec.ts -- consuming fixtures
import { test, expect } from './fixtures';

test('user can log in', async ({ loginPage, dashboardPage }) => {
  await loginPage.goto();
  await loginPage.login('user@example.com', 'password');
  await expect(dashboardPage.heading).toHaveText('Welcome');
});
```

### Adding to Existing Fixtures

When scaffolding a new page object that should integrate with existing fixtures:
1. Show the type addition to the `Fixtures` type
2. Show the fixture registration in `test.extend<>()`
3. Note: "Add this to your existing fixtures.ts"

## Page Object Best Practices

### Constructor Locator Pattern

Define locators in the constructor so they are resolved lazily (not eagerly awaited):

```typescript
class CheckoutPage {
  readonly page: Page;
  readonly cartItems: Locator;
  readonly totalPrice: Locator;
  readonly checkoutButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.cartItems = page.getByTestId('cart-item');
    this.totalPrice = page.getByTestId('total-price');
    this.checkoutButton = page.getByRole('button', { name: 'Checkout' });
  }

  async addItem(name: string) {
    await this.page.getByRole('button', { name: `Add ${name}` }).click();
  }

  async getItemCount(): Promise<number> {
    return this.cartItems.count();
  }
}
```

### Method Naming

- Actions: verb-first (`login`, `addItem`, `submitForm`, `navigateTo`)
- Getters: `get` prefix (`getItemCount`, `getErrorMessage`)
- Navigation: `goto` for initial navigation, no prefix for in-page navigation
- Match existing POM method naming when reusing or extending

### Selector Choice in POMs

Match the project's detected `selectorStrategy`:
- `data-testid`: use `page.getByTestId('...')`
- `role-based`: use `page.getByRole('...', { name: '...' })`
- `label-based`: use `page.getByLabel('...')`
- `css`: use `page.locator('.class')` (least preferred)

## Test Organization Patterns

Match the project's detected `organizationPattern`:

### describe + beforeEach

```typescript
test.describe('Feature: Shopping Cart', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/shop');
  });

  test('can add item to cart', async ({ page }) => { /* ... */ });
  test('can remove item from cart', async ({ page }) => { /* ... */ });
});
```

### test.step for Complex Flows

```typescript
test('complete checkout flow', async ({ page }) => {
  await test.step('Add items to cart', async () => {
    await page.getByTestId('add-item-1').click();
    await page.getByTestId('add-item-2').click();
  });

  await test.step('Proceed to checkout', async () => {
    await page.getByRole('button', { name: 'Checkout' }).click();
    await expect(page).toHaveURL(/.*checkout/);
  });
});
```

## Waiting Strategies

Prefer explicit waits over implicit ones. Never use `page.waitForTimeout()`.

| Scenario | Pattern |
|---|---|
| Element appears | `await expect(locator).toBeVisible()` |
| Navigation completes | `await page.waitForURL('**/dashboard')` |
| Network settles | `await page.waitForLoadState('networkidle')` |
| API response | `await page.waitForResponse(url => url.includes('/api/data'))` |
| Element disappears | `await expect(locator).not.toBeVisible()` |

## CI/CD Config (GitHub Actions)

```yaml
name: E2E Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npx playwright test
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```
