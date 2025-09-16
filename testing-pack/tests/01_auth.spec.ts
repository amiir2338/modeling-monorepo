import { test, expectEx as expect } from './setup/fixtures';
import { loginUI, discoverLoginPath } from './utils/authHelper';

test.describe('Auth', () => {
  test('Client can login via UI and see dashboard', async ({ page }) => {
    await loginUI(page, 'client');
    await expect(page).not.toHaveURL(/\/auth\/(login|register)|\/(login|signin|register)/i);
    await expect(page.locator('body')).toBeVisible();
  });

  test('Reject wrong creds', async ({ page }) => {
    await discoverLoginPath(page);

    const email = page.locator('input[name="email"], input[type="email"], [placeholder*="email" i], [data-testid="email"]').first();
    const pass  = page.locator('input[name="password"], input[type="password"], [placeholder*="password" i], [data-testid="password"]').first();
    const submit = page.locator('button[type="submit"], button:has-text("Sign in"), button:has-text("Log in"), [data-testid="submit"]').first();

    await email.fill('wrong@example.com');
    await pass.fill('nope');
    await submit.click();

    const candidates = [
      page.getByRole('alert'),
      page.locator('[data-testid="auth-error"]'),
      page.locator('.error, .alert-error'),
      page.getByText(/invalid|wrong|failed|incorrect|unauthorized|نامعتبر|اشتباه/i),
    ];

    let shown = false;
    for (const loc of candidates) {
      try { if (await loc.first().isVisible()) { shown = true; break; } } catch {}
    }
    if (!shown) {
      await expect(page).toHaveURL(/\/auth\/(login|register)|\/(login|signin|register)/i, { timeout: 5000 });
    }
  });
});
