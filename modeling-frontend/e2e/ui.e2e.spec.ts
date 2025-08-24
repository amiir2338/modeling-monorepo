import { test, expect } from '@playwright/test';
import { FRONT_BASE } from './helpers';

test('UI smoke login', async({page})=>{
  await page.goto(`${FRONT_BASE}/auth/login`);
  await expect(page.locator('input[type="email"]')).toBeVisible();
});
