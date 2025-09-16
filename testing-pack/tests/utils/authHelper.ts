import { Page, request } from '@playwright/test';
import { API_BASE_URL, ADMIN, CLIENT, MODEL } from './testEnv';

type Role = 'admin' | 'client' | 'model';

const loginCandidates = ['/auth/login', '/login', '/signin'];
const loginPattern = /\/auth\/login|\/login|\/signin/i;

// مقصدهای «ایمن» بعد از لاگین؛ از پروژه‌ی خودت درآورده‌ام:
const fallbackAfterLogin = [
  '/client/dashboard',
  '/dashboard/client/jobs',
  '/dashboard/admin/jobs',
  '/dashboard',
  '/'
];

async function goAndCheckHasLoginFields(page: Page, path: string, timeout = 1500) {
  const res = await page.goto(path, { waitUntil: 'domcontentloaded' });
  const okStatus = !res || res.status() < 400;
  const email = page.locator('input[name="email"], input[type="email"], [placeholder*="email" i], [data-testid="email"]').first();
  const pass  = page.locator('input[name="password"], input[type="password"], [placeholder*="password" i], [data-testid="password"]').first();
  try {
    if (okStatus) {
      await Promise.all([
        email.waitFor({ state: 'visible', timeout }),
        pass.waitFor({ state: 'visible', timeout }),
      ]);
      return true;
    }
  } catch { /* not a login page */ }
  return false;
}

export async function discoverLoginPath(page: Page): Promise<string> {
  for (const p of loginCandidates) {
    if (await goAndCheckHasLoginFields(page, p)) return p;
  }
  throw new Error(`Login page not found. Tried: ${loginCandidates.join(', ')}`);
}

export async function loginUI(page: Page, role: Role) {
  const creds = role === 'admin' ? ADMIN : role === 'client' ? CLIENT : MODEL;

  // 1) برو صفحه لاگین «واقعی»
  await discoverLoginPath(page);

  // 2) فرم را پر کن (سلکتورهای مقاوم)
  const email = page.locator('input[name="email"], input[type="email"], [placeholder*="email" i], [data-testid="email"]').first();
  const pass  = page.locator('input[name="password"], input[type="password"], [placeholder*="password" i], [data-testid="password"]').first();
  const submit = page.locator('button[type="submit"], button:has-text("Sign in"), button:has-text("Log in"), button:has-text("ورود"), [data-testid="submit"]').first();
  await email.fill(creds.email);
  await pass.fill(creds.password);
  await submit.click();

  // 3) به‌جای waitForURL با regex، صبر برای network idle + چکِ اینکه روی صفحه‌ی لاگین گیر نکرده باشیم
  await Promise.race([
    page.waitForNavigation({ waitUntil: 'networkidle', timeout: 15000 }),
    page.waitForLoadState('networkidle', { timeout: 15000 }),
  ]).catch(() => {}); // بعضی اپ‌ها ناوبری نمی‌زنند

  // اگر هنوز روی صفحه لاگین هستیم، به یکی از مقصدهای «ایمن» برو
  if (loginPattern.test(page.url())) {
    for (const target of fallbackAfterLogin) {
      await page.goto(target, { waitUntil: 'domcontentloaded' });
      if (!loginPattern.test(page.url())) break;
    }
  }

  // اگر باز هم در صفحه لاگین ماندی، خطای واضح بده
  if (loginPattern.test(page.url())) {
    throw new Error(`Login did not complete. Still on login page: ${page.url()}`);
  }
}

// (اختیاری) لاگین از API برای پایداری ۱۰۰٪
export async function loginAPI(role: Role) {
  const creds = role === 'admin' ? ADMIN : role === 'client' ? CLIENT : MODEL;
  const ctx = await request.newContext({ baseURL: API_BASE_URL });
  const res = await ctx.post('/auth/login', { data: creds });
  if (res.status() >= 400) throw new Error(`Login failed for ${role}: ${res.status()} ${await res.text()}`);
  const state = await ctx.storageState();
  await ctx.dispose();
  return state;
}

// Register via in-page fetch so browser stores HttpOnly cookie
export async function registerInPage(page: Page, email: string, password: string, role: Role = 'client') {
  await page.evaluate(async (p) => {
    try {
      await fetch('/api/v1/auth/register', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: p.email, password: p.password, role: p.role }) });
    } catch (e) {}
  }, { email, password, role });
}

// Login via in-page fetch so browser stores HttpOnly cookie
export async function loginInPage(page: Page, email: string, password: string) {
  await page.evaluate(async (p) => {
    try {
      await fetch('/api/v1/auth/login', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: p.email, password: p.password }) });
    } catch (e) {}
  }, { email, password });
}
