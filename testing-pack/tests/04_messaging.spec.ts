import { test, expectEx as expect } from './setup/fixtures';
import { loginUI } from './utils/authHelper';

test('Client can open messages and see list', async ({ page }) => {
  await loginUI(page, 'client');
  await page.goto('/messages', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/\/messages/i);

  // بسته به UI: یک لیست/مکالمه/چت آیتم وجود دارد
  const list = page.locator('[data-testid="message-item"], [role="listitem"], .chat-item').first();
  await expect(list).toBeVisible({ timeout: 6000 });
});
