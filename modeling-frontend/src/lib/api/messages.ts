// src/lib/api/messages.ts
// Messages API (POST/GET /v1/messages ، PATCH /v1/messages/:id/read) — بدون any و با هدرهای تایپ‌ـسیف

// ---------- Common pagination ----------
export interface Paginated<T> {
  ok: true;
  items: T[];
  page: number;
  limit: number;
  total: number;
}

// ---------- DTOs ----------
export interface Attachment {
  url?: string;
  name?: string;
  type?: string;
  size?: number;
  [k: string]: unknown;
}

export interface MessageDTO {
  _id: string;
  threadId: string;
  applicationId?: string;
  senderId: string;
  recipientId: string;
  text: string;
  attachments: ReadonlyArray<Attachment>;
  createdAt: string;
  updatedAt: string;
  [k: string]: unknown;
}

export interface SendMessageInput {
  applicationId?: string; // الزامی اگر threadId نداریم
  threadId?: string;      // الزامی اگر applicationId نداریم
  text?: string;
  attachments?: ReadonlyArray<Attachment>;
}

export interface SendMessageOutputOK {
  ok: true;
  data: { message: MessageDTO; threadId: string };
}

export interface ApiFail {
  ok: false;
  message: string;
}

// ---------- utils ----------
function apiBase(): string {
  // prefer runtime/global NEXT_PUBLIC_API_BASE or fallback to getApiBase
  const v =
    (typeof window !== 'undefined' && (window as any).NEXT_PUBLIC_API_BASE) || '';
  // import lazy to avoid circular during module init
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getApiBase } = require('@/lib/env');
    const host = String(getApiBase() || v || 'http://localhost:4000');
    return host.replace(/\/+$/g, '') + '/api';
  } catch (e) {
    return (v || 'http://localhost:4000').replace(/\/+$/g, '') + '/api';
  }
}

function authHeader(token?: string): Record<string, string> {
  const t =
    token ||
    (typeof window !== 'undefined'
      ? localStorage.getItem('token') || localStorage.getItem('authToken') || ''
      : '');
  return t ? { Authorization: `Bearer ${t}` } : {};
}

/** تبدیل HeadersInit به آبجکت ساده برای spread ایمن */
function toPlainHeaders(h?: HeadersInit): Record<string, string> {
  if (!h) return {};
  if (Array.isArray(h)) {
    return Object.fromEntries(h as Array<[string, string]>);
  }
  // Headers (چه در مرورگر چه در Node)
  const maybeHeaders = h as unknown as { forEach?: (cb: (v: string, k: string) => void) => void };
  if (typeof maybeHeaders?.forEach === 'function') {
    const out: Record<string, string> = {};    
    (h as Headers).forEach((v: string, k: string) => (out[k] = v));
    return out;
  }
  // در نهایت فرض می‌کنیم Record<string,string> است
  return h as Record<string, string>;
}

async function getJSON<T>(url: string, token?: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      ...authHeader(token),
      ...toPlainHeaders(init?.headers),
    },
    credentials: 'include',
    ...init,
  });
  const data = (await res.json().catch(() => ({}))) as unknown;
  if (!res.ok) {
    const msg =
      (data && typeof data === 'object' && 'message' in (data as Record<string, unknown>)
        ? String((data as Record<string, unknown>).message)
        : '') || res.statusText;
    throw new Error(msg);
  }
  return data as T;
}

async function postJSON<T>(url: string, body: unknown, token?: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeader(token),
      ...toPlainHeaders(init?.headers),
    },
    body: JSON.stringify(body ?? {}),
    credentials: 'include',
    ...init,
  });
  const data = (await res.json().catch(() => ({}))) as unknown;
  if (!res.ok) {
    const msg =
      (data && typeof data === 'object' && 'message' in (data as Record<string, unknown>)
        ? String((data as Record<string, unknown>).message)
        : '') || res.statusText;
    throw new Error(msg);
  }
  return data as T;
}

async function patchJSON<T>(url: string, body: unknown, token?: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...authHeader(token),
      ...toPlainHeaders(init?.headers),
    },
    body: JSON.stringify(body ?? {}),
    credentials: 'include',
    ...init,
  });
  const data = (await res.json().catch(() => ({}))) as unknown;
  if (!res.ok) {
    const msg =
      (data && typeof data === 'object' && 'message' in (data as Record<string, unknown>)
        ? String((data as Record<string, unknown>).message)
        : '') || res.statusText;
    throw new Error(msg);
  }
  return data as T;
}

function isOk<T extends { ok: true } | { ok: false }>(r: T): r is Extract<T, { ok: true }> {
  return (r as { ok: unknown }).ok === true;
}

// ---------- API ----------
/** ارسال پیام (الزام: یکی از applicationId یا threadId) */
export async function sendMessage(input: SendMessageInput, token?: string): Promise<SendMessageOutputOK> {
  const base = apiBase();
  if (!input.applicationId && !input.threadId) {
    throw new Error('applicationId یا threadId لازم است');
  }
  const r = await postJSON<SendMessageOutputOK | ApiFail>(`${base}/v1/messages`, input, token);
  if (isOk(r)) return r;
  throw new Error(r.message);
}

/** لیست پیام‌ها با یکی از threadId یا applicationId */
export async function listMessages(params: {
  threadId?: string;
  applicationId?: string;
  page?: number;
  limit?: number;
  token?: string;
}): Promise<Paginated<MessageDTO>> {
  const base = apiBase();
  const q = new URLSearchParams();
  if (params.threadId) q.set('threadId', params.threadId);
  if (params.applicationId) q.set('applicationId', params.applicationId);
  if (params.page) q.set('page', String(params.page));
  if (params.limit) q.set('limit', String(params.limit));
  if (!params.threadId && !params.applicationId) {
    throw new Error('threadId یا applicationId لازم است');
  }
  const r = await getJSON<Paginated<MessageDTO> | ApiFail>(`${base}/v1/messages?${q.toString()}`, params.token);
  if (isOk(r)) return r as Paginated<MessageDTO>;
  throw new Error(r.message);
}

/** خوانده‌شدن یک پیام */
export async function markMessageRead(id: string, token?: string): Promise<{ ok: true } & Record<string, unknown>> {
  if (!id) throw new Error('id پیام لازم است');
  const base = apiBase();
  const r = await patchJSON<{ ok: boolean } | ApiFail>(`${base}/v1/messages/${encodeURIComponent(id)}/read`, {}, token);
  if (isOk(r as { ok: boolean } | ApiFail)) return r as { ok: true } & Record<string, unknown>;
  throw new Error((r as ApiFail).message);
}

