import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { loginUI } from './utils/authHelper';

function loadRoutes() {
  const p1 = path.resolve(__dirname, '../routes.json');
  const p2 = path.resolve(process.cwd(), 'routes.json');
  const p = fs.existsSync(p1) ? p1 : p2;
  return JSON.parse(fs.readFileSync(p, 'utf8')) as {
    public: string[]; auth: string[]; admin: string[];
  };
}

const routes = loadRoutes();
const entryPattern = /\/auth\/(login|register)|\/(login|signin|register)/i;

const authTargets = (routes.auth || []).length ? routes.auth : ['/client/dashboard', '/dashboard/client/jobs'];
const adminTargets = (routes.admin || []).length ? routes.admin : ['/dashboard/admin/jobs'];
const publicNonEntry = (routes.public || []).filter(r => !entryPattern.test(r));

test.describe('Permissions / redirects', () => {
  test('Anonymous → protected route should redirect to login', async ({ page, baseURL }) => {
    test.skip(!baseURL, 'baseURL is not configured');
    await page.goto(authTargets[0], { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(entryPattern);
  });

  test('Anonymous → admin route should redirect to login', async ({ page, baseURL }) => {
    test.skip(!baseURL, 'baseURL is not configured');
    await page.goto(adminTargets[0], { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(entryPattern);
  });

  test('Client logged-in → can access protected route (no redirect to login)', async ({ page }) => {
    await loginUI(page, 'client');
    await page.goto(authTargets[0], { waitUntil: 'domcontentloaded' });
    await expect(page).not.toHaveURL(entryPattern);
    await expect(page.locator('body')).toBeVisible();
  });

  for (const r of publicNonEntry) {
    test(`Public non-entry: ${r} should not redirect to login`, async ({ page, baseURL }) => {
      test.skip(!baseURL, 'baseURL is not configured');
      await page.goto(r, { waitUntil: 'domcontentloaded' });
      await expect(page).not.toHaveURL(entryPattern);
    });
  }
});
