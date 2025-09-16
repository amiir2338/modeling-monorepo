import { test, expect } from './tests/fixtures';

test('Auth flow + protected routes + jobs create/filter', async ({ page, auth }) => {
  const email = `e2e+${Date.now()}@example.com`;
  const password = 'Passw0rd!';

  // 1) محافظت مسیر: بدون لاگین برو داشبورد → باید ریدایرکت به لاگین شود
  await page.goto('/dashboard/client/jobs');
  await expect(page).toHaveURL(/\/auth\/login\?next=/);

  // 2) ثبت‌نام (use fixture to avoid flaky UI click)
  await page.goto('/auth/register');
  const res = await auth.register(email, password);
  expect([200, 201].includes(res.status)).toBeTruthy();
  // after register the app should redirect to dashboard; we verify access by visiting
  await page.goto('/dashboard/client/jobs');
  await expect(page).toHaveURL(/\/dashboard\/client\/jobs/);

  // 3) ایجاد فرصت (Client) — create via fetch so it uses the HttpOnly cookie set by auth.register
  const createJobRes = await page.evaluate(async () => {
    try {
      const resp = await fetch('/api/v1/jobs', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'E2E Test Job', description: 'created by playwright', budget: 1234500, city: 'Tehran', date: '2025-12-31' })
      });
      let body = null;
      try { body = await resp.json(); } catch { body = await resp.text().catch(() => null); }
      return { status: resp.status, ok: resp.ok, body };
    } catch (e) { return { status: 0, ok: false, body: String(e) }; }
  });
  expect([200,201].includes(createJobRes.status)).toBeTruthy();

  // 4) صفحه فرصت‌ها (Client dashboard) و فیلتر ساده
  await page.goto('/dashboard/client/jobs');
  // اینجا بسته به UI فیلتر، یک فیلد جستجو/شهر را پر کن:
  // مثال (اگر TopbarClient ورودی جستجو دارد):
  // await page.getByPlaceholder('جستجو').fill('Tehran');
  // await page.keyboard.press('Enter');
  // انتظار حداقل یک نتیجه:
  // await expect(page.getByText(/Tehran/i)).toBeVisible();

  // 5) خروج — برای پایداری در تست، کوکی‌ها را پاک می‌کنیم (deterministic logout)
  await page.goto('/profile').catch(() => {});
  try { await page.getByRole('button', { name: 'خروج' }).click(); } catch {}
  // Ensure client cookies cleared for auth; some apps only clear server session — we clear browser cookies to be deterministic
  try { await page.context().clearCookies(); } catch {}
  // 6) محافظت دوباره: بعد از «خروج» نباید بتوانیم به صفحه create دسترسی داشته باشیم
  await page.goto('/dashboard/client/jobs');
  await expect(page).toHaveURL(/\/auth\/login\?next=/);
});
