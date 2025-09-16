import { request, APIRequestContext, Page } from '@playwright/test';
import { API_BASE_URL } from './testEnv';

export async function api(): Promise<APIRequestContext> {
  return await request.newContext({ baseURL: API_BASE_URL });
}

/**
 * Run a fetch inside the given Page so the browser network stack handles Set-Cookie / HttpOnly cookies.
 * Returns a small serializable result: { status, ok, text }
 */
export async function pageFetch(page: Page, method: string, path: string, body?: any) {
  return await page.evaluate(async (args: any) => {
    const { method, path, body } = args;
    try {
      const res = await fetch(path, {
        method,
        credentials: 'include',
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const text = await res.text().catch(() => null);
      return { status: res.status, ok: res.ok, text };
    } catch (e) {
      return { status: 0, ok: false, text: String(e) };
    }
  }, { method, path, body });
}
