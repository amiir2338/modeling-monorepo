import { test as base, expect, BrowserContext, Page } from '@playwright/test';

type AuthHelpers = {
  register: (email: string, password: string, page?: Page) => Promise<{ status: number; ok: boolean; body: any }>;
  login: (email: string, password: string, page?: Page) => Promise<{ status: number; ok: boolean; body: any }>;
  cookies: (ctx?: BrowserContext) => Promise<any[]>;
};

export const test = base.extend<{ auth: AuthHelpers }>({
  auth: async ({ page, context }, use) => {
    const helpers: AuthHelpers = {
      register: async (email: string, password: string, p?: Page) => {
        const runPage = p || page;
        const res = await runPage.evaluate(async (params) => {
          try {
            const r = await fetch('/api/v1/auth/register', {
              method: 'POST',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: params.email, password: params.password, role: 'client' })
            });
            let body = null;
            try { body = await r.json(); } catch { body = await r.text().catch(() => null); }
            return { status: r.status, ok: r.ok, body };
          } catch (e) { return { status: 0, ok: false, body: String(e) }; }
        }, { email, password });
        return res as any;
      },
      login: async (email: string, password: string, p?: Page) => {
        const runPage = p || page;
        const res = await runPage.evaluate(async (params) => {
          try {
            const r = await fetch('/api/v1/auth/login', {
              method: 'POST',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: params.email, password: params.password })
            });
            let body = null;
            try { body = await r.json(); } catch { body = await r.text().catch(() => null); }
            return { status: r.status, ok: r.ok, body };
          } catch (e) { return { status: 0, ok: false, body: String(e) }; }
        }, { email, password });
        return res as any;
      },
      cookies: async (ctx?: BrowserContext) => (ctx ? ctx.cookies() : context.cookies()),
    };
    await use(helpers);
  }
});

export const expectAuth = expect;
