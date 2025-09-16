// e2e/ui.e2e.spec.ts
import { test, expect, Page } from '@playwright/test';

const FRONT_BASE = process.env.FRONT_BASE || 'http://localhost:3000';

async function gotoAndFindEmail(page: Page) {  // مسیرهای احتمالی صفحه لاگین (هر کدام شد، قبول)
  const paths = [
    '/auth/login',
    '/login',
    '/signin',
    '/account/login',
    '/auth/signin',
    '/',
  ];

  // سِلکتورهای احتمالی برای input ایمیل
  const emailSelectors = [
    'input[type="email"]',
    'input[name="email"]',
    'input#email',
    'input[placeholder*="email" i]',
    'input[autocomplete="username"]',
  ];

  for (const p of paths) {
    const url = p.startsWith('http') ? p : `${FRONT_BASE}${p}`;
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    // اگر Root است و لینک «ورود» دارد، کلیک کن
    const loginLink = page.locator('a:has-text("Login"), a:has-text("ورود"), a[href*="login"], a[href*="signin"]');
    if (await loginLink.first().isVisible().catch(() => false)) {
      await loginLink.first().click();
    }

    // دنبال input ایمیل بگرد
    for (const sel of emailSelectors) {
      const el = page.locator(sel);
      if (await el.first().isVisible().catch(() => false)) {
        return el.first();
      }
    }
  }

  // اگر نرسیدیم اینجا، یعنی پیدا نشد
  return null;
}

test('UI smoke login (robust)', async ({ page }) => {
  const emailInput = await gotoAndFindEmail(page);

  if (!emailInput) {
    // برای دیباگ بیشتر، وضعیت صفحه را لاگ کن
    const title = await page.title().catch(() => '');
    const url = page.url();
    const bodyText = await page.locator('body').innerText().catch(() => '');
    console.log('[UI-DEBUG] title:', title);
    console.log('[UI-DEBUG] url:', url);
    console.log('[UI-DEBUG] body-start:', bodyText.slice(0, 500));

    // اسکرین‌شات برای گزارش
    await page.screenshot({ path: 'test-results/ui-login-not-found.png', fullPage: true });

    throw new Error('نتوانستم input ایمیل را در هیچ‌یک از مسیرهای رایج پیدا کنم. ساختار صفحه لاگین را چک کن.');
  }

  await expect(emailInput).toBeVisible();
});

