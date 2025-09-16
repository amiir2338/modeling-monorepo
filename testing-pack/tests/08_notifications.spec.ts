import { test, expect } from '@playwright/test';
import { loginUI } from './utils/authHelper';

test.describe('Notifications', () => {
  test('User sees notifications list', async ({ page }) => {
    await loginUI(page, 'client');
    await page.goto('/notifications');
    await expect(page.getByText(/notifications|اعلان/i)).toBeVisible();
  });
});
