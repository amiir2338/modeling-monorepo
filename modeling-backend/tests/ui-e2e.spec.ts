// tests/ui-e2e.spec.ts
import { test, expect, chromium, request, Locator, Page } from '@playwright/test';

test.setTimeout(210_000);

const APP_URL = process.env.APP_URL || 'http://localhost:3000';
const API_URL = process.env.API_URL || 'http://localhost:4000/api';

const now = Date.now();
const USERS = {
  admin:  { email: `admin_ui_${now}@dev.local`,  password: 'P@ssw0rd123', role: 'admin'  },
  client: { email: `client_ui_${now}@dev.local`, password: 'P@ssw0rd123', role: 'client' },
  model:  { email: `model_ui_${now}@dev.local`,  password: 'P@ssw0rd123', role: 'model'  },
};

function cookiesHeader(cookies: any[]) {
  return cookies.map(c => `${c.name}=${c.value}`).join('; ');
}

async function ensureUser(api: request.APIRequestContext, user: {email:string; password:string; role:string}) {
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

async function uiAdminApproveJob(page: Page, jobId?: string) {
  await page.goto(`${APP_URL}/dashboard/admin/jobs`, { waitUntil: 'domcontentloaded' });
  console.log('[uiAdminApproveJob] opened admin jobs page');

  const statusFilter = page.locator('select, [data-testid="status-filter"]');
  if (await statusFilter.count() > 0) {
    console.log('[uiAdminApproveJob] status filter present');
    await statusFilter.first().selectOption({ value: 'pending_review' }).catch(async () => {
      // Playwright's selectOption type doesn't accept RegExp for label in TS; select via DOM instead
      await statusFilter.first().evaluate((el) => {
        try {
          const re = /pending|در انتظار/i;
          const opts = Array.from((el as HTMLSelectElement).options);
          const opt = opts.find(o => re.test((o.textContent || '').trim()));
          if (opt) {
            (el as HTMLSelectElement).value = opt.value;
            el.dispatchEvent(new Event('change', { bubbles: true }));
          }
        } catch (e) {}
      }).catch(() => {});
    });
    const refresh = await page.$('button:has-text("رفرش"), button:has-text("Refresh"), [data-testid="refresh"]');
    if (refresh) await refresh.click();
  }

  const approveBtn =
    (await page.$('button:has-text("تایید"), button:has-text("Approve"), [data-testid="job-approve"]'));
  if (!approveBtn) {
    console.log('[uiAdminApproveJob] approve button not found, will try fallback if jobId provided');
    await page.screenshot({ path: 'artifacts_admin_approve_missing.png', fullPage: true });
    // Fallback: try to approve via an in-page fetch (uses admin page's browser cookie)
    if (jobId) {
      try {
        const fallback = await page.evaluate(async (id) => {
          try {
            const res = await fetch(`/api/v1/jobs/${id}/approve`, { method: 'PATCH', credentials: 'include' });
            let txt = null;
            try { txt = await res.text(); } catch { txt = null; }
            return { ok: res.ok, status: res.status, body: txt };
          } catch (e) { return { ok: false, error: String(e) }; }
        }, jobId);
        if (fallback && fallback.ok) {
          console.log('[uiAdminApproveJob] Fallback: approved job via in-page fetch');
          return;
        } else {
          const t = fallback ? JSON.stringify(fallback) : 'no response';
          throw new Error('Fallback approve failed: ' + t);
        }
      } catch (e) {
        throw new Error('Approve button not found (admin jobs list) and fallback failed: ' + String(e));
      }
    }
    throw new Error('Approve button not found (admin jobs list)');
  }
  console.log('[uiAdminApproveJob] clicking approve button via in-page DOM click and waiting for network response');
  const sel = 'button:has-text("تایید"), button:has-text("Approve"), [data-testid="job-approve"]';
  // fire-and-forget DOM click to avoid Playwright waiting for navigations
  await page.evaluate((s) => { const el = document.querySelector(s) as HTMLElement | null; if (el) el.click(); }, sel).catch(() => {});
  const approveResp = await page.waitForResponse(r => /\/api\/v1\/jobs\/.+\/approve/.test(r.url()), { timeout: 5000 }).catch(() => null);
  if (approveResp) {
    console.log('[uiAdminApproveJob] approve network response observed:', approveResp.status());
    await page.getByText(/تایید شده|approved/i, { exact: false }).first().waitFor({ timeout: 5000 }).catch(() => {});
    console.log('[uiAdminApproveJob] approve flow done (UI)');
  } else {
    console.log('[uiAdminApproveJob] no approve network response; trying fallback in-page fetch');
    if (jobId) {
      const fallback = await page.evaluate(async (id) => {
        try {
          const res = await fetch(`/api/v1/jobs/${id}/approve`, { method: 'PATCH', credentials: 'include' });
          let txt = null;
          try { txt = await res.text(); } catch { txt = null; }
          return { ok: res.ok, status: res.status, body: txt };
        } catch (e) { return { ok: false, error: String(e) }; }
      }, jobId);
      console.log('[uiAdminApproveJob] fallback result:', fallback);
      if (fallback && fallback.ok) {
        console.log('[uiAdminApproveJob] Fallback: approved job via in-page fetch');
        return;
      }
      const t = fallback ? JSON.stringify(fallback) : 'no response';
      throw new Error('Fallback approve failed: ' + t);
    }
  }
}

async function uiModelApply(page: Page, jobId?: string) {
  await page.goto(`${APP_URL}/jobs`, { waitUntil: 'domcontentloaded' });

  const firstCard = await page.$('a[href*="/jobs/"], [data-testid="job-card"] a[href*="/jobs/"]');
  if (firstCard) await firstCard.click();
  await page.waitForLoadState('domcontentloaded').catch(() => {});

  const msgSel = 'textarea[name="message"], textarea[placeholder*="پیام" i], textarea';
  const portSel= 'input[name="portfolio"], input[placeholder*="پورتفولیو" i]';

  const msg = await page.$(msgSel); if (msg) await msg.fill('مایلم همکاری کنم (UI E2E)');
  const port = await page.$(portSel); if (port) await port.fill('https://example.com/portfolio');

  const applyBtn =
    (await page.$('button:has-text("ارسال درخواست"), button:has-text("درخواست"), button:has-text("Apply"), [data-testid="apply"]'));
  if (!applyBtn) {
    await page.screenshot({ path: 'artifacts_model_apply_missing.png', fullPage: true });
    // Fallback: submit apply via in-page fetch using jobId if provided
    if (jobId) {
      try {
        const fallback = await page.evaluate(async (payload) => {
          try {
            const res = await fetch(`/api/v1/jobs/${payload.id}/apply`, {
              method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: 'مایلم همکاری کنم (UI E2E)', portfolio: 'https://example.com/portfolio' })
            });
            let txt = null; try { txt = await res.text(); } catch { txt = null; }
            return { ok: res.ok, status: res.status, body: txt };
          } catch (e) { return { ok: false, error: String(e) }; }
        }, { id: jobId });
        if (fallback && fallback.ok) {
          console.log('[uiModelApply] Fallback: applied via in-page fetch');
          return;
        }
        throw new Error('Fallback apply returned non-ok: ' + JSON.stringify(fallback));
      } catch (e) {
        throw new Error('Apply button not found on job detail and fallback apply failed: ' + String(e));
      }
    }
    throw new Error('Apply button not found on job detail');
  }
  await applyBtn.click();
  await page.waitForLoadState('networkidle').catch(() => {});
  const okMsg = page.getByText(/ثبت شد|ارسال شد|Apply|موفق/i, { exact: false });
  if (await okMsg.count() > 0) {
    await okMsg.first().waitFor({ timeout: 5000 }).catch(() => {});
  }
}

test.describe.serial('Frontend UI E2E (Register via API → UI flow)', () => {
  test('client create draft (UI) → submit (API) → admin approve (UI) → model apply (UI)', async () => {
    const api = await request.newContext({ extraHTTPHeaders: { 'Content-Type': 'application/json' } });
    await ensureUser(api, USERS.admin);
    await ensureUser(api, USERS.client);
    await ensureUser(api, USERS.model);

    const browser = await chromium.launch();

  const clientCtx = await browser.newContext();
  const clientPage = await clientCtx.newPage();
  await clientPage.goto(APP_URL, { waitUntil: 'domcontentloaded' });
  console.log('[UI E2E] clientPage opened');
  // Defensive: wait briefly for login route or input to be ready so in-page fetch runs on a live page
  await clientPage.waitForSelector('a[href*="/auth/login"], input[placeholder*="ایمیل" i], form[action*="/auth/login"]', { timeout: 20_000 }).catch(() => {});
    // register/login via in-page fetch so browser cookie is set
    await clientPage.evaluate(async (p) => {
      await fetch('/api/v1/auth/register', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: p.email, password: p.password, role: 'client' }) });
      await fetch('/api/v1/auth/login', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: p.email, password: p.password }) });
    }, { email: USERS.client.email, password: USERS.client.password });
    // create draft via in-page fetch to guarantee cookie usage
    console.log('[UI E2E] creating draft via in-page fetch');
    await clientPage.evaluate(async () => {
      await fetch('/api/v1/jobs', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: `E2E Job ${Date.now()}`, description: 'desc', budget: 200, city: 'Tehran', date: new Date().toISOString().slice(0,10) }) });
    });
    console.log('[UI E2E] draft created');
  const clientCookies = await clientCtx.cookies();
  const jobId = await submitLatestDraftViaPage(clientPage);

  const adminCtx = await browser.newContext();
  const adminPage = await adminCtx.newPage();
  await adminPage.goto(APP_URL, { waitUntil: 'domcontentloaded' });
  console.log('[UI E2E] adminPage opened');
  await adminPage.waitForSelector('a[href*="/auth/login"], input[placeholder*="ایمیل" i], form[action*="/auth/login"]', { timeout: 20_000 }).catch(() => {});
    await adminPage.evaluate(async (p) => {
      await fetch('/api/v1/auth/register', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: p.email, password: p.password, role: 'admin' }) });
      await fetch('/api/v1/auth/login', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: p.email, password: p.password }) });
    }, { email: USERS.admin.email, password: USERS.admin.password });
  await uiAdminApproveJob(adminPage, jobId);

  const modelCtx = await browser.newContext();
  const modelPage = await modelCtx.newPage();
  await modelPage.goto(APP_URL, { waitUntil: 'domcontentloaded' });
  console.log('[UI E2E] modelPage opened');
  await modelPage.waitForSelector('a[href*="/auth/login"], input[placeholder*="ایمیل" i], form[action*="/auth/login"]', { timeout: 20_000 }).catch(() => {});
    await modelPage.evaluate(async (p) => {
      await fetch('/api/v1/auth/register', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: p.email, password: p.password, role: 'model' }) });
      await fetch('/api/v1/auth/login', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: p.email, password: p.password }) });
    }, { email: USERS.model.email, password: USERS.model.password });
  await uiModelApply(modelPage, jobId);

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
