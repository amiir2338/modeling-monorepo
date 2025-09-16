import { test, expectEx as expect } from './setup/fixtures';
import fs from 'fs';
import path from 'path';
import { loginUI } from './utils/authHelper';

// ---- routes helpers ----
function loadRoutes() {
  const p1 = path.resolve(__dirname, '../routes.json');
  const p2 = path.resolve(process.cwd(), 'routes.json');
  const p = fs.existsSync(p1) ? p1 : p2;
  return JSON.parse(fs.readFileSync(p, 'utf8')) as {
    public: string[]; auth: string[]; admin: string[];
  };
}
const routes = loadRoutes();
const ENTRY_PATTERN = /\/auth\/(login|register)|\/(login|signin|register)/i;

const LIST_CANDIDATES = [
  '/dashboard/client/jobs',
  '/client/dashboard',
  ...(routes.auth || []).filter(r => /jobs/i.test(r)),
  '/jobs'
];
const NEW_CANDIDATES = [
  '/dashboard/client/jobs/new',
  ...(routes.auth || []).filter(r => /jobs\/?new|new\/?jobs/i.test(r)),
  '/jobs/new'
];

// ---- generic helpers ----
async function gotoFirstAvailable(page, list: string[], witness?: RegExp) {
  for (const r of list) {
    const res = await page.goto(r, { waitUntil: 'domcontentloaded' });
    const ok = !res || res.status() < 400;
    if (!ok) continue;
    if (witness) {
      try { await page.getByText(witness).first().waitFor({ timeout: 1500 }); }
      catch { continue; }
    }
    return r;
  }
  throw new Error(`No available route among: ${list.join(', ')}`);
}
async function clickFirst(page, qs: Array<() => import('@playwright/test').Locator>) {
  for (const q of qs) {
    const el = q(); if (await el.count()) { await el.first().click(); return true; }
  } return false;
}
async function fillFirst(page, qs: Array<() => import('@playwright/test').Locator>, v: string) {
  for (const q of qs) {
    const el = q(); if (await el.count()) { await el.first().fill(v); return true; }
  } return false;
}
async function selectFlexible(page, labelRe: RegExp, optionRe: RegExp) {
  const lab = page.getByLabel(labelRe).first();
  if (await lab.count()) {
    const isSelect = await lab.evaluate(el => el.tagName.toLowerCase() === 'select').catch(()=>false);
    if (isSelect) { await lab.selectOption({ label: new RegExp(optionRe, 'i') as any }).catch(()=>{}); return; }
    await lab.click().catch(()=>{});
  }
  await page.locator('[role="combobox"]').first().click().catch(()=>{});
  const opt = page.locator('[role="option"]').filter({ hasText: optionRe });
  if (await opt.count()) await opt.first().click().catch(()=>{});
}
async function waitNetworkOrToast(page, timeout = 15000) {
  await Promise.race([
    page.waitForLoadState('networkidle', { timeout }).catch(()=>{}),
    page.waitForResponse(r => /(job|jobs|api\/v\d+\/jobs)/i.test(r.url()) && r.status() < 400, { timeout }).catch(()=>false),
  ]);
}

// ---- scenario helpers ----
async function ensureOnJobsList(page) {
  const used = await gotoFirstAvailable(page, LIST_CANDIDATES);
  expect(ENTRY_PATTERN.test(page.url()), `Should not be on login after goto(${used})`).toBeFalsy();
  await page.locator('body').waitFor({ timeout: 10_000 });
}
async function ensureJobExists(page) {
  await ensureOnJobsList(page);
  if (await page.locator('[data-testid="job-item"], [role="row"], .job-card').count()) return;

  try { await gotoFirstAvailable(page, NEW_CANDIDATES); }
  catch {
    await ensureOnJobsList(page);
    const ok = await clickFirst(page, [
      () => page.getByRole('button', { name: /new job|create|ایجاد|افزودن/i }),
      () => page.locator('a[href*="jobs/new"], a:has-text("New")'),
      () => page.locator('[data-testid="new-job"], .btn-new-job')
    ]);
    if (!ok) throw new Error('New Job trigger not found');
  }

  await fillFirst(page, [
    () => page.locator('input[name="title"]'),
    () => page.locator('[data-testid="title"]'),
    () => page.locator('input[placeholder*="title" i]'),
    () => page.getByLabel(/title|عنوان/i)
  ], 'Bootstrap Job (E2E)');

  await fillFirst(page, [
    () => page.locator('textarea[name="description"]'),
    () => page.locator('[data-testid="description"]'),
    () => page.locator('textarea[placeholder*="description" i]'),
    () => page.getByLabel(/description|توضیح/i)
  ], 'Auto-created by test to enable edit flow');

  await selectFlexible(page, /category|دسته/i, /general|عمومی|other/i).catch(()=>{});
  await fillFirst(page, [
    () => page.locator('input[name="city"]'),
    () => page.locator('[data-testid="city"]'),
    () => page.getByLabel(/city|شهر/i)
  ], 'Tehran').catch(()=>{});
  await fillFirst(page, [
    () => page.locator('input[name="budget"]'),
    () => page.locator('[data-testid="budget"]'),
    () => page.getByLabel(/budget|قیمت|بودجه/i)
  ], '500').catch(()=>{});

  expect(await clickFirst(page, [
    () => page.getByRole('button', { name: /create|save|ثبت|ایجاد/i }),
    () => page.locator('[data-testid="save-job"]'),
  ])).toBeTruthy();
  await waitNetworkOrToast(page);
  await ensureOnJobsList(page);
}

// ---- tests ----
test.describe('Jobs (client)', () => {
  test.beforeEach(async ({ page }) => { await loginUI(page, 'client'); });

  test('List jobs', async ({ page }) => {
    await ensureOnJobsList(page); // tracing دستی حذف شد تا تداخل نداشته باشه
  });

  test('Create new job', async ({ page }) => {
    let onNew = false;
    try { await gotoFirstAvailable(page, NEW_CANDIDATES); onNew = true; }
    catch {
      await ensureOnJobsList(page);
      onNew = await clickFirst(page, [
        () => page.getByRole('button', { name: /new job|create|ایجاد|افزودن/i }),
        () => page.locator('a[href*="jobs/new"], a:has-text("New")'),
        () => page.locator('[data-testid="new-job"], .btn-new-job')
      ]);
    }
    expect(onNew).toBeTruthy();

    await fillFirst(page, [
      () => page.locator('input[name="title"]'),
      () => page.locator('[data-testid="title"]'),
      () => page.locator('input[placeholder*="title" i]'),
      () => page.getByLabel(/title|عنوان/i)
    ], 'Playwright Test Job');

    await fillFirst(page, [
      () => page.locator('textarea[name="description"]'),
      () => page.locator('[data-testid="description"]'),
      () => page.locator('textarea[placeholder*="description" i]'),
      () => page.getByLabel(/description|توضیح/i)
    ], 'Created by automated E2E');

    await fillFirst(page, [
      () => page.locator('input[name="city"]'),
      () => page.locator('[data-testid="city"]'),
      () => page.getByLabel(/city|شهر/i)
    ], 'Tehran').catch(()=>{});
    await fillFirst(page, [
      () => page.locator('input[name="budget"]'),
      () => page.locator('[data-testid="budget"]'),
      () => page.getByLabel(/budget|قیمت|بودجه/i)
    ], '500').catch(()=>{});

    await clickFirst(page, [
      () => page.getByRole('button', { name: /create|save|ثبت|ایجاد/i }),
      () => page.locator('[data-testid="save-job"]'),
    ]);
    await waitNetworkOrToast(page);

    await ensureOnJobsList(page);
    await expect(page.getByText(/Playwright Test Job/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('Edit and then view my job', async ({ page }) => {
    await ensureJobExists(page);

    const firstRow = page.locator('[data-testid="job-item"], [role="row"], .job-card').first();
    await firstRow.waitFor({ timeout: 15_000 });

    if (await page.getByRole('button', { name: /view|نمایش|جزئیات/i }).count())
      await page.getByRole('button', { name: /view|نمایش|جزئیات/i }).first().click();
    else
      await firstRow.click();

    if (await page.getByRole('button', { name: /edit|ویرایش/i }).count())
      await page.getByRole('button', { name: /edit|ویرایش/i }).first().click();

    await fillFirst(page, [
      () => page.locator('input[name="title"]'),
      () => page.locator('[data-testid="title"]'),
      () => page.locator('input[placeholder*="title" i]'),
      () => page.getByLabel(/title|عنوان/i)
    ], 'Playwright Edited Job');

    await clickFirst(page, [
      () => page.getByRole('button', { name: /save|update|ذخیره|به‌روزرسانی/i }),
      () => page.locator('[data-testid="save-job"]')
    ]);
    await waitNetworkOrToast(page);

    await expect(page.getByText(/saved|updated|ذخیره شد|به‌روزرسانی/i)).toBeVisible();
  });
});
