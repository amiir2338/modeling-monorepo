import { Page, BrowserContext } from '@playwright/test';

export async function registerViaFetch(page: Page, context: BrowserContext, opts: { email: string; password: string; role?: string }) {
  const { email, password, role = 'client' } = opts;
  const result = await page.evaluate(async (p) => {
    try {
      const resp = await fetch('/api/v1/auth/register', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: p.email, password: p.password, role: p.role })
      });
      let body = null;
      try { body = await resp.json(); } catch { body = await resp.text().catch(() => null); }
      return { status: resp.status, ok: resp.ok, body };
    } catch (e) {
      return { status: 0, ok: false, body: String(e) };
    }
  }, { email, password, role });

  const cookies = await context.cookies();
  return { result, cookies };
}

export async function loginViaFetch(page: Page, context: BrowserContext, opts: { email: string; password: string }) {
  const { email, password } = opts;
  const result = await page.evaluate(async (p) => {
    try {
      const resp = await fetch('/api/v1/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: p.email, password: p.password })
      });
      let body = null;
      try { body = await resp.json(); } catch { body = await resp.text().catch(() => null); }
      return { status: resp.status, ok: resp.ok, body };
    } catch (e) {
      return { status: 0, ok: false, body: String(e) };
    }
  }, { email, password });

  const cookies = await context.cookies();
  return { result, cookies };
}
