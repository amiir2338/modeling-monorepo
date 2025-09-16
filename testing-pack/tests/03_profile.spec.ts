import { test, expectEx as expect } from './setup/fixtures';
import { loginUI } from './utils/authHelper';

test('Model can open and update profile basics', async ({ page }) => {
  await loginUI(page, 'model');
  await page.goto('/profile', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/\/profile/i);

  const display = page.locator('input[name="displayName"], [data-testid="displayName"]');
  await expect(display.first()).toBeVisible({ timeout: 5000 });
  await display.first().fill('E2E Model');

  const saveBtn = page.getByRole('button', { name: /save|update|ذخیره|به‌روزرسانی/i }).first();
  await saveBtn.click();

  await expect(page.getByText(/saved|updated|ذخیره شد|به‌روزرسانی/i)).toBeVisible({ timeout: 6000 });
});
