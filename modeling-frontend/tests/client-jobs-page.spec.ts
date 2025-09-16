import { test, expect } from './fixtures';

test.describe('/dashboard/client/jobs page', () => {
  test('guard + load + create + (optional) filter + logout', async ({ page, auth }) => {
    // 🟢 کوکی‌های باقی‌مانده از اجراهای قبلی را پاک کن
    await page.context().clearCookies();

    // 🟢 اول برو به همون origin (مثلاً http://localhost:3000/) تا دسترسی به localStorage داشته باشیم
    await page.goto('/');

    // 🟢 حالا می‌تونیم localStorage/sessionStorage رو پاک کنیم
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });

    const email = `e2e+${Date.now()}@example.com`;
    const password = 'Passw0rd!';

    // ---------- 1) محافظت مسیر ----------
    await page.goto('/dashboard/client/jobs');
    await expect(page).toHaveURL(/\/auth\/login\?next=\/dashboard\/client\/jobs/);

  // ---------- 2) ثبت‌نام (via fixture helper) ----------
  await page.goto('/auth/register');
  const res = await auth.register(email, password);
    expect([200, 201].includes(res.status)).toBeTruthy();
    const cookies = await auth.cookies();
    console.log('E2E DEBUG cookies after register (fixture):', JSON.stringify(cookies));
    // ---------- 3) ایجاد فرصت جدید (ایمن: مستقیم از طریق fetch با cookie مرورگر) ----------
    // Create the job via browser fetch so it uses the HttpOnly access_token cookie already set
    const createJobRes = await page.evaluate(async () => {
      try {
        const resp = await fetch('/api/v1/jobs', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: 'Playwright Job',
            description: 'Created by Playwright',
            price: 2500000,
            city: 'Tehran',
            date: '2025-12-31'
          })
        });
        let body = null;
        try { body = await resp.json(); } catch { body = await resp.text().catch(() => null); }
        return { status: resp.status, ok: resp.ok, body };
      } catch (e) { return { status: 0, ok: false, body: String(e) }; }
    });
    // Ensure job creation returned success (201 or 200)
    expect([200, 201].includes(createJobRes.status)).toBeTruthy();

    // Navigate to the jobs list and capture the GET /api/v1/jobs response for debugging
    await page.goto('/dashboard/client/jobs');
    try {
      const jobsResp = await page.waitForResponse((r) => r.url().includes('/api/v1/jobs') && r.request().method() === 'GET', { timeout: 5000 });
      console.log('E2E DEBUG jobs GET status:', jobsResp.status());
      try {
        const body = await jobsResp.json();
        console.log('E2E DEBUG jobs GET body:', JSON.stringify(body));
      } catch (e) {
        console.log('E2E DEBUG jobs GET body parse error:', String(e));
      }
    } catch (e) {
      console.log('E2E DEBUG jobs GET response not found within timeout:', String(e));
    }

    await expect(page.getByText(/Playwright Job/i)).toBeVisible();

    // ---------- 4) (اختیاری) فیلتر ----------
    const searchInput = page.getByPlaceholder(/جستجو|search/i).first();
    if (await searchInput.count()) {
      await searchInput.fill('Playwright');
      await page.keyboard.press('Enter');
      await expect(page.getByText(/Playwright Job/i)).toBeVisible();
    }

    // ---------- 5) خروج و محافظت مجدد ----------
    const logoutBtnHere = page.getByRole('button', { name: /خروج|logout/i });
    if (await logoutBtnHere.count()) {
      await logoutBtnHere.click();
    } else {
      await page.goto('/profile');
      await page.getByRole('button', { name: /خروج|logout/i }).click();
    }

    await expect(page).toHaveURL(/\/auth\/login$/);

    await page.goto('/dashboard/client/jobs');
    await expect(page).toHaveURL(/\/auth\/login\?next=\/dashboard\/client\/jobs/);
  });
});
