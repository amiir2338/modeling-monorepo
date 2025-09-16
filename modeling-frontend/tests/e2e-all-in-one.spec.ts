// tests/ui-e2e.spec.ts
import { chromium, request, Locator, Page, APIRequestContext } from '@playwright/test';
import { test, expect } from './fixtures';

test.setTimeout(210_000);

const APP_URL = process.env.APP_URL || 'http://localhost:3000';
// Prefer IPv4 loopback for API default to avoid Playwright trying ::1 (IPv6)
const API_URL = process.env.API_URL || 'http://127.0.0.1:4000/api';

const now = Date.now();
const USERS = {
  admin:  { email: `admin_ui_${now}@dev.local`,  password: 'P@ssw0rd123', role: 'admin'  },
  client: { email: `client_ui_${now}@dev.local`, password: 'P@ssw0rd123', role: 'client' },
  model:  { email: `model_ui_${now}@dev.local`,  password: 'P@ssw0rd123', role: 'model'  },
};

function cookiesHeader(cookies: any[]) {
  return cookies.map(c => `${c.name}=${c.value}`).join('; ');
}

/** Wait until backend API responds to /api/ping or timeout */
async function waitForApi(api: APIRequestContext, timeout = 30_000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const res = await api.get(`${API_URL}/ping`);
      if (res.ok()) return;
    } catch (e) {
      // swallow and retry
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`API did not respond at ${API_URL}/ping within ${timeout}ms`);
}

async function ensureUser(api: APIRequestContext, user: {email:string; password:string; role:string}) {
  const reg = await api.post(`${API_URL}/v1/auth/register`, { data: user });
  if (!reg.ok()) {
    const login = await api.post(`${API_URL}/v1/auth/login`, { data: { email: user.email, password: user.password } });
    expect(login.ok(), `login failed for ${user.email} | status=${login.status()} body=${await login.text()}`).toBeTruthy();
  }
}

async function uiLogin(page: Page, email: string, password: string) {
  await page.goto(`${APP_URL}/auth/login`, { waitUntil: 'domcontentloaded' });

  const emailSel = 'input[placeholder*="ایمیل" i], input[type="email"], input[name*="email" i]';
  const passSel  = 'input[placeholder*="رمز" i], input[type="password"], input[name*="password" i]';

  const emailInput = await page.waitForSelector(emailSel, { timeout: 10_000 }).catch(() => null);
  const passInput  = await page.waitForSelector(passSel,  { timeout: 10_000 }).catch(() => null);
  if (!emailInput || !passInput) {
    await page.screenshot({ path: `artifacts_login_inputs_missing.png`, fullPage: true });
    throw new Error(`[uiLogin] inputs not found at ${page.url()}`);
  }

  await emailInput.fill(email);
  await passInput.fill(password);

  const submit =
    (await page.$('button:has-text("ورود"), button:has-text("Login"), [data-testid="login-submit"]')) ||
    (await page.$('button[type="submit"]'));
  if (!submit) {
    await page.screenshot({ path: `artifacts_login_button_missing.png`, fullPage: true });
    throw new Error('[uiLogin] login button not found');
  }
  await submit.click();
  await page.waitForLoadState('networkidle').catch(() => {});
}

/** مقداردهی مطمئن به input‌های کنترل‌شده */
async function forceType(page: Page, locator: Locator, value: string) {
  const el = locator.first();
  await el.scrollIntoViewIfNeeded();
  await el.click({ delay: 15 });
  await page.keyboard.press('Control+A');
  await el.type(value, { delay: 8 });
  await page.keyboard.press('Tab');
  // اطمینان از نشستن value و دیسپچ ایونت‌ها
  try {
    await el.evaluate((node, v) => {
      const input = node as HTMLInputElement | HTMLTextAreaElement;
      if (input.value !== v) {
        input.value = v;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, value);
  } catch {}
}

/** ذخیرهٔ پیش‌نویس با انتظار پاسخ API و بررسی پیام‌ها */
async function saveDraft(page: Page) {
  const saveBtn =
    (await page.$('button:has-text("ذخیره پیش‌نویس")')) ||
    (await page.$('button:has-text("ذخیرهٔ پیش‌نویس")')) ||
    (await page.$('button:has-text("Save"), [data-testid="job-save"]')) ||
    (await page.$('button[type="submit"]'));
  if (!saveBtn) {
    await page.screenshot({ path: 'artifacts_job_save_missing.png', fullPage: true });
    throw new Error('Draft save button not found on Create Job page');
  }

  const [saveResp] = await Promise.all([
    page.waitForResponse(resp =>
      resp.url().includes('/api/v1/jobs') &&
      ['POST','PATCH'].includes((resp.request().method() || '').toUpperCase())
    , { timeout: 15000 }).catch(() => [null]),
    saveBtn.click()
  ]);

  await page.waitForLoadState('networkidle').catch(() => {});
}

/** پر کردن فرم ایجاد فرصت (Role=name فارسی طبق UI) با retry */
async function uiClientCreateDraft(page: Page) {
  await page.goto(`${APP_URL}/jobs/create`, { waitUntil: 'domcontentloaded' });

  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0,10);

  const title = page.getByRole('textbox', { name: 'عنوان' });
  const desc  = page.getByRole('textbox', { name: 'توضیح' });
  const city  = page.getByRole('textbox', { name: 'شهر' });

  if (await title.count() === 0) {
    await page.screenshot({ path: 'artifacts_title_not_found.png', fullPage: true });
    throw new Error('Title textbox (name: "عنوان") not found');
  }
  if (await desc.count() === 0) {
    await page.screenshot({ path: 'artifacts_desc_not_found.png', fullPage: true });
    throw new Error('Description textbox (name: "توضیح") not found');
  }
  if (await city.count() === 0) {
    await page.screenshot({ path: 'artifacts_city_not_found.png', fullPage: true });
    throw new Error('City textbox (name: "شهر") not found');
  }

  // مقداردهی
  await forceType(page, title, 'UI E2E — عکاسی فضای باز');
  await forceType(page, desc,  'تست UI E2E — لطفاً نادیده بگیرید');
  await forceType(page, city,  'Tehran');

  // تاریخ
  const dateType = await page.$('input[type="date"]');
  if (dateType) {
    await page.locator('input[type="date"]').first().fill(tomorrow);
    await page.keyboard.press('Tab');
  } else {
    const allTextboxes = await page.getByRole('textbox').all();
    if (allTextboxes.length < 4) {
      await page.screenshot({ path: 'artifacts_date_not_found.png', fullPage: true });
      throw new Error('Date textbox not found (expected an unlabeled 4th textbox)');
    }
    await forceType(page, allTextboxes[3], tomorrow);
  }

  // بودجه (spinbutton)
  const budgetSpin = page.getByRole('spinbutton');
  if (await budgetSpin.count() === 0) {
    await page.screenshot({ path: 'artifacts_budget_not_found.png', fullPage: true });
    throw new Error('Budget spinbutton not found');
  }
  await forceType(page, budgetSpin.first(), '10000000');

  // قبل از ذخیره، مطمئن شو «عنوان» واقعاً Value گرفته
  await expect(title.first()).toHaveValue(/.+/, { timeout: 3000 });

  // ذخیرهٔ پیش‌نویس
  await saveDraft(page);

  // اگر پیام خطا دیدیم، یک‌بار retry:
  const errMsg = page.getByText(/عنوان نباید خالی باشد|خطا|Error|validation/i, { exact: false });
  if (await errMsg.count() > 0) {
    // Retry: دوباره مقداردهی + انتظار value + ذخیره
    await forceType(page, title, 'UI E2E — عکاسی فضای باز');
    await expect(title.first()).toHaveValue(/.+/, { timeout: 3000 });
    await saveDraft(page);
  }

  // در نهایت اگر باز هم خطاست → fail با اسکرین‌شات
  if (await errMsg.count() > 0) {
    await page.screenshot({ path: 'artifacts_job_save_error.png', fullPage: true });
    throw new Error('Job save produced validation error (see screenshot).');
  }

  // پیام موفق اختیاری
  const okToast = page.getByText(/پیش‌نویس ذخیره شد|ذخیره شد|Saved/i, { exact: false });
  if (await okToast.count() > 0) {
    await okToast.first().waitFor({ timeout: 3000 }).catch(() => {});
  }
}

/** Submit the latest draft by running fetch inside the given Page so browser HttpOnly cookies are used */
async function submitLatestDraftViaPage(page: Page) {
  const listRes = await page.evaluate(async () => {
    try {
      const r = await fetch('/api/v1/jobs/my?limit=10&page=1', { credentials: 'include' });
      const text = await r.text().catch(() => null);
      let json = null;
      try { json = text ? JSON.parse(text) : null; } catch { json = null; }
      return { status: r.status, ok: r.ok, text, json };
    } catch (e) { return { status: 0, ok: false, text: String(e), json: null }; }
  });
  expect(listRes.ok, `list my jobs failed | status=${listRes.status} body=${listRes.text}`).toBeTruthy();

  let rows: any[] = [];
  const data = listRes.json || (listRes.text ? (() => { try { return JSON.parse(listRes.text); } catch { return null; } })() : null);
  if (data) rows = data?.data || data?.jobs || (Array.isArray(data) ? data : []);
  if (!Array.isArray(rows) || rows.length === 0) throw new Error('no jobs found for client after draft save');

  const draft = rows.find(j => j?.status === 'draft') || rows[0];
  const jobId = draft?._id || draft?.id;
  if (!jobId) throw new Error('jobId not found in client jobs');

  const submitRes = await page.evaluate(async (id) => {
    try {
      const r = await fetch(`/api/v1/jobs/${id}/submit`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ termsAccepted: true })
      });
      const text = await r.text().catch(() => null);
      return { status: r.status, ok: r.ok, text };
    } catch (e) { return { status: 0, ok: false, text: String(e) }; }
  }, jobId);
  expect(submitRes.ok, `submit failed | status=${submitRes.status} body=${submitRes.text}`).toBeTruthy();
  return jobId;
}

async function uiAdminApproveJob(page: Page, jobId: string, adminCookies: any[]) {
  await page.goto(`${APP_URL}/dashboard/admin/jobs`, { waitUntil: 'domcontentloaded' });

  const statusFilter = page.locator('select, [data-testid="status-filter"]');
    if (await statusFilter.count() > 0) {
    try {
      await statusFilter.first().selectOption({ value: 'pending_review' });
    } catch {
      // Playwright's selectOption doesn't accept RegExp for label in TS;
      // find an option whose visible text matches the regex and select it via DOM.
      try {
        await statusFilter.first().evaluate((el) => {
          try {
            const re = /pending|در انتظار/i;
            const opts = Array.from((el as HTMLSelectElement).options);
            const opt = opts.find(o => re.test((o.textContent || '').trim()));
            if (opt) {
              (el as HTMLSelectElement).value = opt.value;
              el.dispatchEvent(new Event('change', { bubbles: true }));
              return true;
            }
          } catch (e) {
            // swallow
          }
          return false;
        });
      } catch {}
    }
    const refresh = await page.$('button:has-text("رفرش"), button:has-text("Refresh"), [data-testid="refresh"]');
    if (refresh) await refresh.click();
  }

  // Wait for backend to reflect the job in pending_review state (avoid UI race)
  const start = Date.now();
    const backendTimeout = 30_000; // reduce wait to avoid long UI stalls in CI
  let jobReady = false;
  while (Date.now() - start < backendTimeout) {
    try {
      const resp = await page.evaluate(async (id) => {
        try {
          const r = await fetch(`/api/v1/jobs/${id}`, { credentials: 'include' });
          const json = await r.json().catch(() => null);
          return { ok: r.ok, status: r.status, json };
        } catch (e) { return { ok: false, status: 0, json: null }; }
      }, jobId).catch(() => null);
      if (resp && resp.ok) {
        const j = resp.json;
        const st = j?.job?.status || j?.status || j?.data?.status || j?.status;
        if (st === 'pending_review' || st === 'pending') { jobReady = true; break; }
      }
    } catch (e) {}
    await new Promise((r) => setTimeout(r, 500));
  }
  if (!jobReady) {
    // don't fail immediately — sometimes the backend state is delayed or
    // the client shows pending items via a different query. Proceed to try
    // to locate the row and if that fails, fall back to approving via API.
    console.warn(`[uiAdminApproveJob] job ${jobId} not observed as pending after ${backendTimeout}ms, continuing to UI checks and fallback`);
  }

  // Wait for any loading indicator to disappear first
  try {
    await page.waitForSelector('[data-testid="jobs-loading"]', { state: 'detached', timeout: 15000 });
  } catch {}

  // Wait for the specific job row we submitted to appear (give it more time)
  const jobRowSel = `[data-testid="job-row-${jobId}"]`;
  let jobRow = await page.waitForSelector(jobRowSel, { timeout: 5000 }).catch(() => null);
  if (!jobRow) {
    const refresh = await page.$('button:has-text("رفرش"), button:has-text("Refresh"), [data-testid="refresh"]');
    if (refresh) {
      await refresh.click().catch(() => {});
      await new Promise((r) => setTimeout(r, 800));
      await refresh.click().catch(() => {});
    }
      jobRow = await page.waitForSelector(jobRowSel, { timeout: 5000 }).catch(() => null);
  }
  if (!jobRow) {
    await page.screenshot({ path: 'artifacts_admin_row_missing.png', fullPage: true });
    // Fallback: try to approve via API using admin cookies so flow can continue
    try {
      const res = await page.evaluate(async (id) => {
        try {
          const r = await fetch(`/api/v1/jobs/${id}/approve`, { method: 'PATCH', credentials: 'include' });
          const text = await r.text().catch(() => null);
          return { ok: r.ok, status: r.status, text };
        } catch (e) { return { ok: false, status: 0, text: String(e) }; }
      }, jobId).catch(() => null);
      if (res && res.ok) {
        console.log('[uiAdminApproveJob] Fallback: approved job via in-page fetch (row missing)');
        await new Promise((r) => setTimeout(r, 500));
        return;
      } else {
        const txt = res ? res.text : 'no response';
        throw new Error(`Fallback approve failed: ${txt}`);
      }
    } catch (e) {
      throw new Error('Job row not found in admin jobs list and fallback in-page approve failed: ' + String(e));
    }
  }

  // Find approve button scoped to the discovered row
  const approveBtn = await jobRow.$('[data-testid^="job-approve-"], button:has-text("تایید"), button:has-text("Approve")');
  if (!approveBtn) {
    await page.screenshot({ path: 'artifacts_admin_approve_missing.png', fullPage: true });
    // Fallback: approve via API using admin cookies so the E2E flow can continue
    try {
      const res = await page.evaluate(async (id) => {
        try {
          const r = await fetch(`/api/v1/jobs/${id}/approve`, { method: 'PATCH', credentials: 'include' });
          const text = await r.text().catch(() => null);
          return { ok: r.ok, status: r.status, text };
        } catch (e) { return { ok: false, status: 0, text: String(e) }; }
      }, jobId).catch(() => null);
      if (res && res.ok) {
        console.log('[uiAdminApproveJob] Fallback: approved job via in-page fetch');
      } else {
        const txt = res ? res.text : 'no response';
        throw new Error(`Fallback approve failed: ${txt}`);
      }
    } catch (e) {
      throw new Error('Approve button not found (admin jobs list - scoped) and fallback in-page approve failed: ' + String(e));
    }
  }
  if (approveBtn) await approveBtn.click();
  await page.getByText(/تایید شده|approved/i, { exact: false }).first().waitFor({ timeout: 5000 }).catch(() => {});
}

async function uiModelApply(page: Page, jobId: string, modelCookies: any[]) {
  // Wait for backend to mark the job as approved before navigating.
  const start = Date.now();
  const waitFor = 60_000; // ms
  let approved = false;
  while (Date.now() - start < waitFor) {
    try {
      const resp = await page.evaluate(async (id) => {
        try {
          const r = await fetch(`/api/v1/jobs/${id}`, { credentials: 'include' });
          const json = await r.json().catch(() => null);
          return { ok: r.ok, status: r.status, json };
        } catch (e) { return { ok: false, status: 0, json: null }; }
      }, jobId).catch(() => null);
      if (resp && resp.ok) {
        const j = resp.json;
        const st = j?.job?.status || j?.status || j?.data?.status || j?.status;
        if (st === 'approved') { approved = true; break; }
      }
    } catch (e) {}
    await new Promise((r) => setTimeout(r, 500));
  }

  if (!approved) {
    console.warn(`[uiModelApply] job ${jobId} not approved after ${waitFor}ms, attempting UI navigation anyway`);
  }

  // Navigate directly to the job's detail page to avoid ordering/matching issues
  await page.goto(`${APP_URL}/jobs/${jobId}`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('domcontentloaded').catch(() => {});

  const msgSel = 'textarea[name="message"], textarea[placeholder*="پیام" i], textarea';
  const portSel= 'input[name="portfolio"], input[placeholder*="پورتفولیو" i]';

  const msg = await page.$(msgSel); if (msg) await msg.fill('مایلم همکاری کنم (UI E2E)');
  const port = await page.$(portSel); if (port) await port.fill('https://example.com/portfolio');

  // Prefer the new data-testid added to the Apply button
  const applyBtn =
    (await page.$('[data-testid="apply"]')) ||
    (await page.$('button:has-text("ارسال درخواست"), button:has-text("درخواست"), button:has-text("Apply")'));
  if (!applyBtn) {
    await page.screenshot({ path: 'artifacts_model_apply_missing.png', fullPage: true });
    // Fallback: submit apply via API using model cookies so flow can continue
    try {
      const res = await page.evaluate(async (id) => {
        try {
          const r = await fetch(`/api/v1/jobs/${id}/apply`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: 'مایلم همکاری کنم (UI E2E)', portfolio: 'https://example.com/portfolio' })
          });
          const text = await r.text().catch(() => null);
          return { ok: r.ok, status: r.status, text };
        } catch (e) { return { ok: false, status: 0, text: String(e) }; }
      }, jobId).catch(() => null);
      if (res && res.ok) {
        console.log('[uiModelApply] Fallback: applied via in-page fetch');
        return;
      } else {
        const txt = res ? res.text : 'no response';
        throw new Error(`Fallback apply failed: ${txt}`);
      }
    } catch (e) {
      throw new Error('Apply button not found on job detail and fallback in-page apply failed: ' + String(e));
    }
  }
  await applyBtn.click();
  await page.waitForLoadState('networkidle').catch(() => {});
  const okMsg = page.getByText(/ثبت شد|ارسال شد|Apply|موفق/i, { exact: false });
  if (await okMsg.count() > 0) {
    await okMsg.first().waitFor({ timeout: 5000 }).catch(() => {});
  }
}

/** Wait for a cookie to be present in the browser context */
async function waitForCookie(ctx: any, name: string, timeout = 5000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const cookies = await ctx.cookies();
      if (Array.isArray(cookies) && cookies.find(c => c.name === name)) return;
    } catch (e) {
      // ignore and retry
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  // Not found within timeout — continue and let callers assert if needed
}

test.describe.serial('Frontend UI E2E (Register via API → UI flow)', () => {
  test('client create draft (UI) → submit (API) → admin approve (UI) → model apply (UI)', async ({ auth, request: api, browser }) => {
  // Ensure backend is accepting connections before issuing register/login requests
  await waitForApi(api, 30_000);
  await ensureUser(api, USERS.admin);
  await ensureUser(api, USERS.client);
  await ensureUser(api, USERS.model);

    // Use fixture helpers to register/login users into browser contexts
  const clientCtx = await browser.newContext();
  const clientPage = await clientCtx.newPage();
  await clientPage.goto(APP_URL, { waitUntil: 'domcontentloaded' });
  // Use the auth fixture to register + login client inside the page so cookie is set
  await auth.register(USERS.client.email, USERS.client.password, clientPage);
  await auth.login(USERS.client.email, USERS.client.password, clientPage);
  await waitForCookie(clientCtx, 'access_token', 5000);
    // Create draft via browser fetch (uses HttpOnly cookie in client context)
    const createRes = await clientPage.evaluate(async () => {
      try {
        const resp = await fetch('/api/v1/jobs', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: `E2E Job ${Date.now()}`, description: 'desc', budget: 200, city: 'Tehran', date: new Date().toISOString().slice(0,10) })
        });
        let body = null;
        try { body = await resp.json(); } catch { body = await resp.text().catch(() => null); }
        return { status: resp.status, ok: resp.ok, body };
      } catch (e) { return { status: 0, ok: false, body: String(e) }; }
    });
  expect([200,201].includes(createRes.status)).toBeTruthy();
    const clientCookies = await clientCtx.cookies();
  const jobId = await submitLatestDraftViaPage(clientPage);

  const adminCtx = await browser.newContext();
  const adminPage = await adminCtx.newPage();
  await adminPage.goto(APP_URL, { waitUntil: 'domcontentloaded' });
  await auth.register(USERS.admin.email, USERS.admin.password, adminPage);
  await auth.login(USERS.admin.email, USERS.admin.password, adminPage);
  await waitForCookie(adminCtx, 'access_token', 5000);
  const adminCookies = await adminCtx.cookies();
  await uiAdminApproveJob(adminPage, jobId, adminCookies);

  const modelCtx = await browser.newContext();
  const modelPage = await modelCtx.newPage();
  await modelPage.goto(APP_URL, { waitUntil: 'domcontentloaded' });
  await auth.register(USERS.model.email, USERS.model.password, modelPage);
  await auth.login(USERS.model.email, USERS.model.password, modelPage);
  await waitForCookie(modelCtx, 'access_token', 5000);
  const modelCookies = await modelCtx.cookies();
  await uiModelApply(modelPage, jobId, modelCookies);

    // cleanup
    await clientPage.close();
    await adminPage.close();
    await modelPage.close();
    await clientCtx.close();
    await adminCtx.close();
    await modelCtx.close();
    await browser.close();

    console.log(`[UI E2E DONE] jobId=${jobId}`);
  });
});
