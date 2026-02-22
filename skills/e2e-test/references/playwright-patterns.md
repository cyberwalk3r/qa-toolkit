# Playwright Patterns & Best Practices

## Selector Priority
1. `data-testid` — most stable, won't break with UI changes
2. Role-based — `page.getByRole('button', { name: 'Submit' })`
3. Label-based — `page.getByLabel('Email')` for form fields
4. Text-based — `page.getByText('Welcome')` for content
5. CSS selectors — last resort, most fragile

## Waiting Strategies
```javascript
// ✅ Good — wait for specific element
await page.waitForSelector('[data-testid="results"]');

// ✅ Good — wait for network to settle
await page.waitForLoadState('networkidle');

// ✅ Good — wait for navigation
await Promise.all([
  page.waitForNavigation(),
  page.click('[data-testid="submit"]')
]);

// ❌ Bad — hard-coded wait
await page.waitForTimeout(3000);
```

## Page Object Model
```javascript
// pages/LoginPage.js
class LoginPage {
  constructor(page) {
    this.page = page;
    this.emailInput = page.getByLabel('Email');
    this.passwordInput = page.getByLabel('Password');
    this.submitButton = page.getByRole('button', { name: 'Sign in' });
  }

  async login(email, password) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }
}
```

## Common Assertions
```javascript
// Element visibility
await expect(page.locator('.success')).toBeVisible();
await expect(page.locator('.error')).not.toBeVisible();

// Text content
await expect(page.locator('h1')).toHaveText('Dashboard');
await expect(page.locator('.count')).toContainText('42');

// URL
await expect(page).toHaveURL(/.*dashboard/);

// Input value
await expect(page.getByLabel('Name')).toHaveValue('Alice');
```

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
