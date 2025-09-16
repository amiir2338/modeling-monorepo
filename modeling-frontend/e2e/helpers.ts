// e2e/helpers.ts
type HeadersMap = Record<string, string>;

function headersWithToken(token?: string): HeadersMap {
  const h: HeadersMap = { 'Content-Type': 'application/json' };
  if (token) {
    h['Authorization'] = `Bearer ${token}`;
    // برای سازگاری بیشتر:
    h['authorization'] = `Bearer ${token}`;
    h['x-access-token'] = token;
  }
  return h;
}

// Prefer IPv4 loopback by default to avoid intermittent IPv6 (::1) connect issues
const RAW_BASE = (process.env.API_BASE || 'http://127.0.0.1:4000').replace(/\/+$/g, '');

function apiUrl(path: string) {
  const p = path.startsWith('/') ? path : `/${path}`;
  // If caller already passed an /api path, just append it to the raw base.
  if (p.startsWith('/api')) return RAW_BASE + p;
  // Otherwise build a normalized /api + path composition.
  return RAW_BASE + '/api' + p;
}

export async function http(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  url: string,
  body?: unknown,
  token?: string
): Promise<{ status: number; body: unknown; raw: string }> {
  const full = apiUrl(url);
  // Debug: log the outgoing request url and method
  logStep('http-request', { method, url: full, hasToken: !!token });
  try {
    const res = await fetch(full, {
      method,
      headers: headersWithToken(token),
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const raw = await res.text();
    let parsed: unknown;
    try { parsed = JSON.parse(raw); } catch { parsed = { ok: false, error: raw }; }
    return { status: res.status, body: parsed, raw };
  } catch (e:any) {
    logStep('http-error', { method, url: full, message: String(e?.message || e) });
    return { status: 0, body: { ok: false, error: String(e?.message || e) }, raw: '' };
  }
}

export const get = (u: string, t?: string) => http('GET', u, undefined, t);
export const post = (u: string, b?: unknown, t?: string) => http('POST', u, b, t);
export const patch = (u: string, b?: unknown, t?: string) => http('PATCH', u, b, t);

export function randEmail(prefix: string): string {
  const ts = Date.now();
  const r = Math.random().toString(36).slice(2, 8);
  return `${prefix}.${ts}.${r}@e2e.test`;
}

export function extractToken(b: any): string | undefined {
  return b?.token || b?.data?.token;
}

export function extractId(o: any): string | undefined {
  return o?._id || o?.id;
}

export function firstIdFrom(b: any): string | undefined {
  return (
    extractId((b as any)?.job) ||
    extractId((b as any)?.data?.job) ||
    extractId((b as any)?.data) ||
    extractId(b)
  );
}

export function decodeJwtPayload(token: string): unknown {
  const [, payload] = token.split('.');
  return JSON.parse(Buffer.from(payload, 'base64').toString('utf8'));
}

export function logStep(tag: string, info: unknown): void {
  const stamp = new Date().toISOString();
  const safe = typeof info === 'string' ? info : JSON.stringify(info);
  // eslint-disable-next-line no-console
  console.log(`[${stamp}] [${tag}] ${safe}`);
}

