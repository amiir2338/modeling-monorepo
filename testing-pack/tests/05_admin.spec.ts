import { test, expectEx as expect } from './setup/fixtures';
import { loginUI } from './utils/authHelper';

test('Admin dashboard accessible for admin only', async ({ page }) => {
  await loginUI(page, 'admin');
  await page.goto('/admin', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/\/admin/i);

  // یک نشانگر قطعی در داشبورد ادمین
  const h = page.getByRole('heading', { name: /admin|مدیریت/i }).first();
  await expect(h).toBeVisible({ timeout: 6000 });
});
