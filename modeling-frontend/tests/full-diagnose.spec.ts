// tests/full-diagnose.spec.ts
import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const OUT_DIR = path.join(process.cwd(), 'test-results', 'diagnose');
const HAR_PATH = path.join(OUT_DIR, 'diagnose.har');
const NET_PATH = path.join(OUT_DIR, 'network.jsonl');
function ensureDir(p: string) { try { fs.mkdirSync(p, { recursive: true }); } catch {} }
function wline(file: string, obj: unknown) {
  try { fs.appendFileSync(file, JSON.stringify(obj) + '\n', 'utf-8'); } catch {}
}

test('Full diagnose: auth + cookies + /api/v1/jobs?mine=1 + redirects (HAR + manual net log)', async ({ browser }) => {
  ensureDir(OUT_DIR);
  try { fs.unlinkSync(NET_PATH); } catch {}
  const report: any = { steps: [], notes: [] };
  const add = (step: string, payload: any) => report.steps.push({ step, ...payload });

  const email = `e2e+${Date.now()}@example.com`;
  const password = 'Passw0rd!';

  // کانتکست با HAR
  const context = await browser.newContext({
    baseURL: 'http://localhost:3000',
    recordHar: { path: HAR_PATH, content: 'embed', mode: 'minimal' },
    ignoreHTTPSErrors: true,
  });
  const page = await context.newPage();

  // لاگ‌های کنسول
  const consoleLines: string[] = [];
  page.on('console', (msg) => consoleLines.push(`[console:${msg.type()}] ${msg.text()}`));
  page.on('pageerror', (err) => consoleLines.push(`[pageerror] ${err.message}`));

  // لاگ شبکهٔ دستی (fallback برای HAR)
  page.on('request', (req) => {
    wline(NET_PATH, {
      t: Date.now(),
      kind: 'request',
      method: req.method(),
      url: req.url(),
      headers: req.headers(),
      postData: req.postData() || null,
    });
  });
  page.on('response', async (res) => {
    let bodySnippet: string | null = null;
    try {
      const ct = res.headers()['content-type'] || '';
      if (/json|text/i.test(ct)) {
        const txt = await res.text();
        bodySnippet = txt.length > 2000 ? txt.slice(0, 2000) + '…' : txt;
      }
    } catch {}
    wline(NET_PATH, {
      t: Date.now(),
      kind: 'response',
      url: res.url(),
      status: res.status(),
      headers: res.headers(),
      bodySnippet,
    });
  });

  // آیا Cookie در GET /api/v1/jobs?mine=1 دیده شد؟
  let jobsGetHasCookie = false;
  page.on('request', (req) => {
    const url = req.url();
    if (req.method() === 'GET' && url.includes('/api/v1/jobs') && url.includes('mine=1')) {
      const ck = req.headers()['cookie'];
      jobsGetHasCookie = !!ck && ck.includes('access_token=');
    }
  });

  async function writeOut() {
    try {
      fs.writeFileSync(
        path.join(OUT_DIR, 'report.json'),
        JSON.stringify({ when: new Date().toISOString(), report, console: consoleLines }, null, 2),
        'utf-8'
      );
    } catch {}
    try { await context.close(); } catch {}
  }

  try {
    // 1) بدون لاگین → باید به لاگین ریدایرکت شود (اگر نشد، ادامه می‌دهیم)
    const r1 = await page.goto('/dashboard/client/jobs', { waitUntil: 'domcontentloaded' });
    add('goto-dashboard-without-login', { url: page.url(), status: r1?.status() });
    try {
      await expect(page).toHaveURL(/\/auth\/login\?next=\/dashboard\/client\/jobs/);
      add('redirect-check', { ok: true });
    } catch (e: any) {
      add('redirect-check', { ok: false, message: e?.message, currentUrl: page.url() });
      report.notes.push('No redirect to login; continuing diagnosis…');
    }

    // 2) ثبت‌نام — اجرا از داخل صفحه با fetch(credentials:'include') تا مرورگر Set-Cookie را بپذیرد
    await page.goto('/auth/register', { waitUntil: 'domcontentloaded' });
    // fill visible fields for UX parity (so the page is in expected state)
    try { await page.getByPlaceholder(/email/i).fill(email); } catch {}
    try { await page.getByPlaceholder(/password/i).fill(password); } catch {}

    // Perform the register request from the page context (browser) so Set-Cookie can be handled
    let registerFetchResult: { status?: number; ok?: boolean; body?: any } = {};
    try {
      registerFetchResult = await page.evaluate(async (payload: { email: string; password: string }) => {
        try {
          const resp = await fetch('/api/v1/auth/register', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: payload.email, password: payload.password, role: 'client' })
          });
          let body = null;
          try { body = await resp.json(); } catch { body = await resp.text().catch(() => null); }
          return { status: resp.status, ok: resp.ok, body };
        } catch (e) {
          return { status: 0, ok: false, body: String(e) };
        }
      }, { email, password });
    } catch (e) {
      registerFetchResult = { status: 0, ok: false, body: String(e) };
    }
    add('after-register', { url: page.url(), registerFetchResult });

    // 3) اگر لاگین نشدیم، لاگین کن
    let loginResponseHeaders: Record<string, string> | null = null;
    page.on('response', async (res) => {
      try {
        const req = res.request();
        if (req.method() === 'POST' && req.url().includes('/api/v1/auth/login')) {
          loginResponseHeaders = res.headers();
          wline(NET_PATH, { t: Date.now(), kind: 'response', url: res.url(), status: res.status(), headers: loginResponseHeaders });
        }
      } catch (e) {}
    });

    if (/\/auth\/login/.test(page.url())) {
      await page.getByLabel(/ایمیل|email/i).fill(email);
      await page.getByLabel(/رمز|password/i).fill(password);
      await page.getByRole('button', { name: /ورود|login|sign ?in/i }).click();
      await page.waitForLoadState('domcontentloaded');
      add('after-login', { url: page.url(), loginResponseHeaders });
    }

  // 4) کوکی‌ها را ببین (Playwright context cookies + document.cookie)
  const cookiesAll = await context.cookies();
  const docCookie = await page.evaluate(() => document.cookie);
  add('cookies-after-auth', { cookiesAll, docCookie, registerFetchResult, loginResponseHeaders });

    // 5) کال لیست فرصت‌های من (mine=1)
    const [jobsResp] = await Promise.all([
      page.waitForResponse((r) => r.url().includes('/api/v1/jobs') && r.request().method() === 'GET'),
      page.goto('/dashboard/client/jobs', { waitUntil: 'domcontentloaded' }),
    ]);
    let jobsJson: any = null;
    try { jobsJson = await jobsResp.json(); } catch {}
    add('jobs-list-call', {
      requestUrl: jobsResp.url(),
      status: jobsResp.status(),
      headerCookieSeen: jobsGetHasCookie,
      bodySnippet: typeof jobsJson === 'object' ? jobsJson : String(jobsJson).slice(0, 400),
    });

    // 6) روت‌های دیباگ بک‌اند (اگر mount شده باشد)
    try {
      const who = await page.evaluate(async () => {
        try {
          const r = await fetch('/api/v1/_debug/whoami', { credentials: 'include' });
          const j = await r.json().catch(() => null);
          return { status: r.status, json: j };
        } catch (e) { return { error: String(e) }; }
      });
      add('_debug/whoami', who);
    } catch (e: any) {
      add('_debug/whoami', { error: e?.message || String(e) });
    }
    try {
      const ck = await page.evaluate(async () => {
        try {
          const r = await fetch('/api/v1/_debug/cookies', { credentials: 'include' });
          const j = await r.json().catch(() => null);
          return { status: r.status, json: j };
        } catch (e) { return { error: String(e) }; }
      });
      add('_debug/cookies', ck);
    } catch (e: any) {
      add('_debug/cookies', { error: e?.message || String(e) });
    }

    // نتیجه‌ی خوانا
    const code = report.steps.find((s: any) => s.step === 'jobs-list-call')?.status as number | undefined;
    expect([200, 204, 304].includes(code ?? 200)).toBeTruthy();

  } finally {
    await writeOut();
  }
});
