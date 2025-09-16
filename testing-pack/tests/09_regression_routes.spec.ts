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

// ورودی‌های احراز هویت (صفحات ورود/ثبت‌نام)
const entryPattern = /\/auth\/(login|register)|\/(login|signin|register)/i;
const entryPages = (routes.public || []).filter(r => entryPattern.test(r));

// صفحات عمومیِ «غیرِ ورود/ثبت‌نام»
const publicNonEntry = (routes.public || []).filter(r => !entryPattern.test(r));

// صفحات محافظت‌شده و ادمین از routes.json
const authTargets = routes.auth || ['/client/dashboard', '/dashboard/client/jobs'];
const adminTargets = routes.admin || ['/dashboard/admin/jobs'];

test.describe('Regression – route rendering', () => {
  test.describe('Public routes (non-auth entry)', () => {
    for (const r of publicNonEntry) {
      test(`Public (non-entry): ${r} renders without redirect to login`, async ({ page, baseURL }) => {
        test.skip(!baseURL, 'baseURL is not configured');
        await page.goto(r, { waitUntil: 'domcontentloaded' });
        // برای صفحات عمومی عادی، نباید به صفحه ورود/ثبت‌نام هدایت شویم
        await expect(page).not.toHaveURL(entryPattern);
        await expect(page.locator('body')).toBeVisible();
      });
    }
  });

  test.describe('Auth entry pages (login/register)', () => {
    for (const r of entryPages) {
      test(`Entry page: ${r} is reachable`, async ({ page, baseURL }) => {
        test.skip(!baseURL, 'baseURL is not configured');
        await page.goto(r, { waitUntil: 'domcontentloaded' });
        // برای خودِ صفحات ورود/ثبت‌نام، انتظار داریم روی همان URL باشیم
        await expect(page).toHaveURL(entryPattern);
        // وجود حداقل بدنه/فرم
        await expect(page.locator('body')).toBeVisible();
      });
    }
  });

  test.describe('Auth routes (client)', () => {
    for (const r of authTargets) {
      test(`Auth: ${r} renders after login`, async ({ page }) => {
        await loginUI(page, 'client');
        await page.goto(r, { waitUntil: 'domcontentloaded' });
        await expect(page).not.toHaveURL(entryPattern);
        await expect(page.locator('body')).toBeVisible();
      });
    }
  });

  test.describe('Admin routes', () => {
    for (const r of adminTargets) {
      test(`Admin: ${r} renders after admin login`, async ({ page }) => {
        await loginUI(page, 'admin');
        await page.goto(r, { waitUntil: 'domcontentloaded' });
        await expect(page).not.toHaveURL(entryPattern);
        await expect(page.locator('body')).toBeVisible();
      });
    }
  });
});
