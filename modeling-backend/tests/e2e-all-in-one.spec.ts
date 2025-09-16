// tests/e2e-all-in-one.spec.ts
import { test, expect, chromium, request } from '@playwright/test';

test.setTimeout(120_000); // 2 دقیقه برای کل سناریو

// آدرس‌ها (در صورت نیاز با ENV override کن)
const APP_URL = process.env.APP_URL || 'http://localhost:3000';
const API_URL = process.env.API_URL || 'http://localhost:4000/api';

// ایمیل‌های یکتا
const now = Date.now();
const USERS = {
  admin:  { email: `admin_${now}@dev.local`,  password: 'P@ssw0rd123', role: 'admin'  },
  client: { email: `client_${now}@dev.local`, password: 'P@ssw0rd123', role: 'client' },
  client2:{ email: `client2_${now}@dev.local`,password: 'P@ssw0rd123', role: 'client' },
  model:  { email: `model_${now}@dev.local`,  password: 'P@ssw0rd123', role: 'model'  },
};

// =============== Helpers ===============
function cookiesHeader(cookies: any[]) {
  return cookies.map(c => `${c.name}=${c.value}`).join('; ');
}
async function getCookies(ctx: any) { return await ctx.cookies(); }

// Run fetch inside the page context so the browser network stack handles Set-Cookie and HttpOnly cookies
async function fetchInPage(page: any, method: string, path: string, body?: any) {
  return await page.evaluate(async (args: any) => {
    const { method: m, path: p, body: b } = args as any;
    const res = await fetch(p, {
      method: m,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: b ? JSON.stringify(b) : undefined
    });
    const text = await res.text();
    return { status: res.status, ok: res.ok, text };
  }, { method, path, body });
}

// ثبت‌نام (اگر بود → لاگین) — use a server-side request context (no browser cookies needed here)
async function ensureUser(api: any, user: {email:string; password:string; role:string}) {
  const reg = await api.post(`${API_URL}/v1/auth/register`, {
    data: { email: user.email, password: user.password, role: user.role }
  });
  if (!reg.ok()) {
    const login = await api.post(`${API_URL}/v1/auth/login`, {
      data: { email: user.email, password: user.password }
    });
    expect(login.ok(), `login failed for ${user.email} | status=${login.status()} body=${await login.text()}`).toBeTruthy();
  }
}

// لاگین UI
async function loginUI(page: any, creds: {email:string; password:string}, who: string) {
  page.setDefaultTimeout(20_000);
  await page.goto(`${APP_URL}/auth/login`, { waitUntil: 'domcontentloaded' });

  const emailSel = 'input[placeholder*="ایمیل" i], input[type="email"], input[name*="email" i]';
  const passSel  = 'input[placeholder*="رمز" i], input[type="password"], input[name*="password" i]';

  const emailInput = await page.waitForSelector(emailSel, { timeout: 10000 }).catch(() => null);
  const passInput  = await page.waitForSelector(passSel,  { timeout: 10000 }).catch(() => null);
  if (!emailInput || !passInput) {
    await page.screenshot({ path: `artifacts_login_${who}.png`, fullPage: true });
    throw new Error(`[loginUI:${who}] inputs not found. URL=${page.url()}`);
  }

  await emailInput.fill(creds.email);
  await passInput.fill(creds.password);

  const btn = await page.$('button:has-text("ورود"), button:has-text("Login"), [data-testid="login-submit"]');
  if (!btn) {
    await page.screenshot({ path: `artifacts_loginbtn_${who}.png`, fullPage: true });
    throw new Error(`[loginUI:${who}] login button not found.`);
  }
  await btn.click();
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
}

// ساخت Job با تمام فیلدهای لازم برای Submit
async function createJob(page: any, title = 'عکاسی پرتره (E2E)') {
  const tomorrowISO = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const url = `${API_URL}/v1/jobs`;
  const payload = {
    title,
    city: 'Tehran',
    budget: 10000000,
    date: tomorrowISO,
    description: 'تست خودکار E2E — لطفاً نادیده بگیرید',
    requirements: ['قد 170+']
  };
  const res = await fetchInPage(page, 'POST', url, payload);
  expect(res.ok, `create job failed | ${res.status} | body=${res.text}`).toBeTruthy();
  let jobId = '';
  try {
    const body = JSON.parse(res.text);
    jobId = body?.job?._id || body?._id || body?.data?._id || '';
  } catch {}
  expect(jobId, `jobId should exist | body=${res.text}`).toBeTruthy();
  return jobId;
}

// گرفتن Job
async function getJob(page: any, jobId: string) {
  const url = `${API_URL}/v1/jobs/${jobId}`;
  const res = await fetchInPage(page, 'GET', url);
  if (!res.ok) return null;
  try { return JSON.parse(res.text)?.job || JSON.parse(res.text)?.data || JSON.parse(res.text); } catch { return null; }
}

// Submit → pending_review
async function submitJob(page: any, jobId: string, body: any = { termsAccepted: true }) {
  const url = `${API_URL}/v1/jobs/${jobId}/submit`;
  return await fetchInPage(page, 'POST', url, body);
}

// Approve (با نقش ادمین)
async function adminApprove(page: any, jobId: string) {
  let res = await fetchInPage(page, 'PATCH', `${API_URL}/v1/jobs/${jobId}/approve`);
  if (!res.ok) {
    res = await fetchInPage(page, 'PATCH', `${API_URL}/v1/admin/jobs/${jobId}/approve`);
  }
  if (!res.ok) {
    throw new Error(`approve failed | status=${res.status} body=${res.text}`);
  }
  const after = await getJob(page, jobId);
  const status = after?.status;
  expect(status === 'approved', `status after approve should be approved | got=${status}`).toBeTruthy();
}

// Apply مدل
async function modelApply(page: any, jobId: string) {
  const res = await fetchInPage(page, 'POST', `${API_URL}/v1/jobs/${jobId}/apply`, { message: 'مایلم همکاری کنم', portfolio: 'https://example.com/p1' });
  expect(res.status < 400, `apply failed | ${res.status} | body=${res.text}`).toBeTruthy();
  let applicationId = '';
  try {
    const body = JSON.parse(res.text);
    applicationId = body?.applicationId || body?.application?._id || body?._id || '';
  } catch {}
  expect(applicationId, `applicationId should exist | body=${res.text}`).toBeTruthy();
  return applicationId;
}

// =============== Full E2E اصلی ===============
let SHARED = {
  jobIdApproved: '' as string,
  applicationId: '' as string,
  cookies: {
    client: [] as any[],
    admin: [] as any[],
    model: [] as any[],
  }
};

test.describe.serial('ALL-IN-ONE E2E: client → admin → model → client', () => {
  test('run full flow', async () => {
    const api = await request.newContext({ extraHTTPHeaders: { 'Content-Type': 'application/json' } });

    // 0) کاربران
    await ensureUser(api, USERS.admin);
    await ensureUser(api, USERS.client);
    await ensureUser(api, USERS.client2);
    await ensureUser(api, USERS.model);

    // 1) Client → login + create job + submit
    const browser = await chromium.launch();
    const clientCtx = await browser.newContext();
    const clientPage = await clientCtx.newPage();
    await loginUI(clientPage, USERS.client, 'client');
    SHARED.cookies.client = await getCookies(clientCtx);

  const jobId = await createJob(clientPage, 'آگهی اصلی برای Approved (E2E)');
  const submitRes = await submitJob(clientPage, jobId, { termsAccepted: true });
    expect(submitRes.ok, `submit failed | ${submitRes.status} | body=${submitRes.text}`).toBeTruthy();

    await clientPage.close();

    // 2) Admin → login + approve
    const adminCtx = await browser.newContext();
    const adminPage = await adminCtx.newPage();
    await loginUI(adminPage, USERS.admin, 'admin');
    SHARED.cookies.admin = await getCookies(adminCtx);
  await adminApprove(adminPage, jobId);
    SHARED.jobIdApproved = jobId;
    await adminPage.close();

    // 3) Model → login + apply
    const modelCtx = await browser.newContext();
    const modelPage = await modelCtx.newPage();
    await loginUI(modelPage, USERS.model, 'model');
    SHARED.cookies.model = await getCookies(modelCtx);
  SHARED.applicationId = await modelApply(modelPage, jobId);
    await modelPage.close();

    // 4) Client → review (قبول کردن همان درخواست)
    const clientPage2 = await clientCtx.newPage();
    await loginUI(clientPage2, USERS.client, 'client-2');
    const clientCookies2 = await getCookies(clientCtx);

  const listRes = await fetchInPage(clientPage2, 'GET', `${API_URL}/v1/jobs/${jobId}/applications`);
    const listTxt = listRes.text;
  expect(listRes.status, `list applications failed | ${listRes.status} | body=${listTxt}`).toBeLessThan(400);
    let pickedAppId = '';
    try {
      const apps = JSON.parse(listTxt);
      pickedAppId = apps?.[0]?._id || apps?.applications?.[0]?._id || SHARED.applicationId || '';
    } catch { pickedAppId = SHARED.applicationId; }
    expect(pickedAppId, 'no application to review').toBeTruthy();

  const accept = await fetchInPage(clientPage2, 'PATCH', `${API_URL}/v1/applications/${pickedAppId}`, { status: 'accepted' });
    expect(accept.ok, `accept application failed | ${accept.status} body=${accept.text}`).toBeTruthy();

    await clientPage2.close();
    await clientCtx.close();
    await adminCtx.close();
    await modelCtx.close();
    await browser.close();
  });

  // ===== (1) Reject flow + منع Apply روی rejected =====
  test('admin reject flow and prevent apply on rejected job', async () => {
    const api = await request.newContext({ extraHTTPHeaders: { 'Content-Type': 'application/json' } });

    // کلاینت یک آگهی دیگر می‌سازد → submit
    const browser = await chromium.launch();
    const clientCtx = await browser.newContext();
    const clientPage = await clientCtx.newPage();
    await loginUI(clientPage, USERS.client, 'client-reject');
    const clientCookies = await getCookies(clientCtx);

  const jobId = await createJob(clientPage, 'آگهی برای Reject (E2E)');
  const submitRes = await submitJob(clientPage, jobId, { termsAccepted: true });
    expect(submitRes.ok, `submit failed | ${submitRes.status} | body=${submitRes.text}`).toBeTruthy();
    await clientPage.close();

    // ادمین → reject با reason
    const adminCtx = await browser.newContext();
    const adminPage = await adminCtx.newPage();
    await loginUI(adminPage, USERS.admin, 'admin-reject');
    const adminCookies = await getCookies(adminCtx);

    const rej = await fetchInPage(adminPage, 'PATCH', `${API_URL}/v1/jobs/${jobId}/reject`, { reason: 'کیفیت توضیحات کافی نیست' });
    const rejTxt = rej.text;
    expect(rej.ok, `reject failed | ${rej.status} body=${rejTxt}`).toBeTruthy();

    // وضعیت باید rejected شود
    const after = await getJob(adminPage, jobId);
    expect(after?.status === 'rejected', `status after reject should be rejected | got=${after?.status}`).toBeTruthy();

    // مدل نتواند Apply بزند
    const modelCtx = await browser.newContext();
    const modelPage = await modelCtx.newPage();
    await loginUI(modelPage, USERS.model, 'model-reject');
    const modelCookies = await getCookies(modelCtx);

    const app2 = await fetchInPage(modelPage, 'POST', `${API_URL}/v1/jobs/${jobId}/apply`, { message: 'تلاش روی rejected', portfolio: 'https://example.com/p2' });
    expect(app2.status, `apply on rejected should fail | status=${app2.status} body=${app2.text}`).toBeGreaterThanOrEqual(400);

    await adminPage.close();
    await modelPage.close();
    await clientCtx.close();
    await adminCtx.close();
    await modelCtx.close();
    await browser.close();
  });

  // ===== (2) RBAC negative cases =====
  test('RBAC negative: model create job / client approve / model patch application', async () => {
    const api = await request.newContext({ extraHTTPHeaders: { 'Content-Type': 'application/json' } });

    const browser = await chromium.launch();

    // مدل نتواند job بسازد
    const modelCtx = await browser.newContext();
    const modelPage = await modelCtx.newPage();
    await loginUI(modelPage, USERS.model, 'model-rbac');
    const modelCookies = await getCookies(modelCtx);

    const tryCreate = await fetchInPage(modelPage, 'POST', `${API_URL}/v1/jobs`, { title: 'نباید ساخته شود', city: 'X', budget: 1, date: new Date().toISOString(), description: 'x', requirements: [] });
    expect(tryCreate.status, `model should not create job | status=${tryCreate.status} body=${tryCreate.text}`).toBeGreaterThanOrEqual(400);

    // کلاینت نباید approve بزند
    const clientCtx = await browser.newContext();
    const clientPage = await clientCtx.newPage();
    await loginUI(clientPage, USERS.client, 'client-rbac');
    const clientCookies = await getCookies(clientCtx);

    const tryApprove = await fetchInPage(clientPage, 'PATCH', `${API_URL}/v1/jobs/${SHARED.jobIdApproved}/approve`);
    expect(tryApprove.status, `client should not approve | status=${tryApprove.status} body=${tryApprove.text}`).toBeGreaterThanOrEqual(400);

    // مدل نباید application را تغییر دهد
    const tryPatchApp = await fetchInPage(modelPage, 'PATCH', `${API_URL}/v1/applications/${SHARED.applicationId}`, { status: 'accepted' });
    expect(tryPatchApp.status, `model should not patch application | status=${tryPatchApp.status} body=${tryPatchApp.text}`).toBeGreaterThanOrEqual(400);

    await modelPage.close();
    await clientPage.close();
    await modelCtx.close();
    await clientCtx.close();
    await browser.close();
  });

  // ===== (3) Apply تکراری =====
  test('duplicate apply on same job should fail', async () => {
    const api = await request.newContext({ extraHTTPHeaders: { 'Content-Type': 'application/json' } });

    const browser = await chromium.launch();
    const modelCtx = await browser.newContext();
    const modelPage = await modelCtx.newPage();
    await loginUI(modelPage, USERS.model, 'model-dup');
    const modelCookies = await getCookies(modelCtx);

    const res = await fetchInPage(modelPage, 'POST', `${API_URL}/v1/jobs/${SHARED.jobIdApproved}/apply`, { message: 'apply دوباره', portfolio: 'https://example.com/p3' });
    expect(res.status, `duplicate apply should fail | status=${res.status} body=${res.text}`).toBeGreaterThanOrEqual(400);

    await modelPage.close();
    await modelCtx.close();
    await browser.close();
  });

  // ===== (4) Submit نامعتبر =====
  test('invalid submit (missing termsAccepted or fields) should fail', async () => {
    const api = await request.newContext({ extraHTTPHeaders: { 'Content-Type': 'application/json' } });

    const browser = await chromium.launch();
    const clientCtx = await browser.newContext();
    const clientPage = await clientCtx.newPage();
    await loginUI(clientPage, USERS.client2, 'client2-invalid');
    const clientCookies = await getCookies(clientCtx);

    // آگهی ناقص (بدون budget)
    const resCreate = await fetchInPage(clientPage, 'POST', `${API_URL}/v1/jobs`, {
      title: 'Submit نامعتبر (E2E)',
      city: 'Tehran',
      // budget intentionally missing
      date: new Date(Date.now() + 86400000).toISOString(),
      description: 'ناقص برای تست',
      requirements: []
    });
    const bodyTxt = resCreate.text;
    expect(resCreate.ok, `create (incomplete) should still create draft | ${resCreate.status} body=${bodyTxt}`).toBeTruthy();
    let jobId = '';
    try { const b = JSON.parse(bodyTxt); jobId = b?.job?._id || b?._id || b?.data?._id || ''; } catch {}
    expect(jobId, `jobId should exist | body=${bodyTxt}`).toBeTruthy();

    // submit بدون termsAccepted
    const resSubmit1 = await submitJob(clientPage, jobId, { /* termsAccepted missing */ });
    expect(resSubmit1.status, `submit without termsAccepted should fail | status=${resSubmit1.status} body=${resSubmit1.text}`).toBeGreaterThanOrEqual(400);

    // submit با termsAccepted اما هنوز فیلدها ناقص
    const resSubmit2 = await submitJob(clientPage, jobId, { termsAccepted: true });
    expect(resSubmit2.status, `submit with missing required fields should fail | status=${resSubmit2.status} body=${resSubmit2.text}`).toBeGreaterThanOrEqual(400);

    await clientPage.close();
    await clientCtx.close();
    await browser.close();
  });
});
