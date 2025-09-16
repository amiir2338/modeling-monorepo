// e2e/ui.smoke.spec.ts
import { test, expect } from '@playwright/test';

const FRONT_BASE = process.env.FRONT_BASE || 'http://localhost:3000';

test('UI smoke login (robust)', async ({ page }) => {
  // مسیرهای مختلف احتمالی لاگین
  const candidates = [
    `${FRONT_BASE}/auth/login`,
    `${FRONT_BASE}/login`,
    `${FRONT_BASE}/auth/sign-in`,
    `${FRONT_BASE}/signin`,
    `${FRONT_BASE}/auth`,
  ];
  let found = false;
  for (const url of candidates) {
    await page.goto(url);
    const email = page.locator('input[type="email"]');
    if (await email.count()) { found = true; break; }
  }
  // اگر ایمیل نبود، حداقل یک input پیدا کن تا ui زنده بودن صفحه را تأیید کنیم
  if (!found) {
    await page.goto(`${FRONT_BASE}`);
    const anyInput = page.locator('input');
    await expect(anyInput.first()).toBeVisible({ timeout: 15000 });
  } else {
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 15000 });
  }
});

