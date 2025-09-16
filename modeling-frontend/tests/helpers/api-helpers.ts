import { Page } from '@playwright/test';

export async function createJobViaFetch(page: Page, payload: { title: string; description: string; budget?: number | null; city?: string; date?: string }) {
  const res = await page.evaluate(async (p) => {
    try {
      const r = await fetch('/api/v1/jobs', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(p)
      });
      let body = null;
      try { body = await r.json(); } catch { body = await r.text().catch(() => null); }
      return { status: r.status, ok: r.ok, body };
    } catch (e) {
      return { status: 0, ok: false, body: String(e) };
    }
  }, payload);
  return res as any;
}
