// src/lib/api/threads.ts

import { getApiBase } from '@/lib/env';

// Host-only base (no trailing /api). buildUrl will ensure /api prefix.
const API_HOST = (typeof window !== 'undefined' && (window as any).NEXT_PUBLIC_API_BASE) || getApiBase() || 'http://localhost:4000';
function buildUrl(path: string) {
  const p = path.startsWith('/') ? path : `/${path}`;
  if (p.startsWith('/api/')) return `${API_HOST}${p}`;
  return `${API_HOST}/api${p}`;
}

function authHeader(token?: string): Record<string, string> {
  const t =
    token ||
    (typeof window !== "undefined"
      ? localStorage.getItem("token") ||
        localStorage.getItem("authToken") ||
        localStorage.getItem("access_token")
      : "");
  return t ? { Authorization: `Bearer ${t}` } : {};
}

// ادغام هدرها به‌صورت تایپ-سیف
function mergeHeaders(base?: HeadersInit, extra?: HeadersInit): HeadersInit {
  const h = new Headers(base);
  if (extra) new Headers(extra).forEach((v, k) => h.set(k, v));
  return h;
}

function extractErrorMessage(data: unknown, fallback: string): string {
  if (data && typeof data === "object") {
    const d = data as { message?: string; error?: string };
    return d.message ?? d.error ?? fallback;
  }
  return fallback;
}

async function getJSON<T>(
  url: string,
  token?: string,
  init?: RequestInit
): Promise<T> {
  const headers = mergeHeaders(authHeader(token), init?.headers);
  const res = await fetch(url, {
    ...init,
    method: "GET",
    headers,
    credentials: "include",
  });
  const data: unknown = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(extractErrorMessage(data, res.statusText));
  return data as T;
}

async function postJSON<T>(
  url: string,
  body?: unknown,
  token?: string,
  init?: RequestInit
): Promise<T> {
  const headers = mergeHeaders(
    { "Content-Type": "application/json", ...authHeader(token) },
    init?.headers
  );
  const res = await fetch(url, {
    ...init,
    method: "POST",
    headers,
    body: JSON.stringify(body ?? {}),
    credentials: "include",
  });
  const data: unknown = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(extractErrorMessage(data, res.statusText));
  return data as T;
}

// -------- Types --------
export interface ThreadDTO {
  _id: string;
  participants: string[];
  applicationId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Paginated<T> {
  ok: true;
  data: T[];
  page: number;
  limit: number;
  total: number;
}

// -------- APIs --------

// لیست تردها
export async function listThreads(params?: {
  page?: number;
  limit?: number;
  token?: string;
}): Promise<Paginated<ThreadDTO>> {
  const q = new URLSearchParams();
  if (params?.page) q.set("page", String(params.page));
  if (params?.limit) q.set("limit", String(params.limit));
  const url = `${buildUrl(`/v1/threads`)}${q.toString() ? `?${q.toString()}` : ''}`;
  return getJSON<Paginated<ThreadDTO>>(url, params?.token);
}

// alias برای سازگاری با کدهای موجود (ThreadList.tsx از fetchThreads ایمپورت می‌کند)
export const fetchThreads = listThreads;

// ساخت/یافتن ترد از روی applicationId
export async function threadByApplication(
  applicationId: string,
  token?: string
): Promise<{ ok: boolean; thread: ThreadDTO }> {
  return postJSON<{ ok: boolean; thread: ThreadDTO }>(
    `${buildUrl(`/v1/threads/by-application`)}`,
    { applicationId },
    token
  );
}

// شمارش پیام‌های خوانده‌نشده‌ی کاربر (در صورت استفاده‌ی NotificationBell)
export async function fetchUnreadCount(token?: string): Promise<number> {
  const r = await getJSON<{ ok: boolean; count: number }>(
    `${buildUrl('/v1/threads/unread-count')}`,
    token
  );
  return r.count ?? 0;
}

