// src/lib/api/notifications.ts

import { getApiBase } from "../env";

// API base — use centralized helper which strips any trailing `/api`
function apiBaseHost(): string {
  return getApiBase();
}

// ساخت هدر احراز هویت
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

// ادغام امن هدرها بدون استفاده از any
function mergeHeaders(base?: HeadersInit, extra?: HeadersInit): HeadersInit {
  const h = new Headers(base);
  if (extra) new Headers(extra).forEach((v, k) => h.set(k, v));
  return h;
}

// استخراج پیام خطا از پاسخ JSON
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
  if (!res.ok) {
    throw new Error(extractErrorMessage(data, res.statusText));
  }
  return data as T;
}

async function patchJSON<T>(
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
    method: "PATCH",
    headers,
    body: JSON.stringify(body ?? {}),
    credentials: "include",
  });
  const data: unknown = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(extractErrorMessage(data, res.statusText));
  }
  return data as T;
}

async function delJSON<T>(
  url: string,
  token?: string,
  init?: RequestInit
): Promise<T> {
  const headers = mergeHeaders(authHeader(token), init?.headers);
  const res = await fetch(url, {
    ...init,
    method: "DELETE",
    headers,
    credentials: "include",
  });
  const data: unknown = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(extractErrorMessage(data, res.statusText));
  }
  return data as T;
}

// ===== Types =====
export interface NotificationDTO {
  _id: string;
  type: string;
  message: string;
  read: boolean;
  createdAt: string;
  meta?: Record<string, unknown>;
}

export interface Paginated<T> {
  ok: true;
  data: T[];
  page: number;
  limit: number;
  total: number;
}

// ===== APIs =====
export async function listNotifications(params?: {
  page?: number;
  limit?: number;
  token?: string;
}): Promise<Paginated<NotificationDTO>> {
  const q = new URLSearchParams();
  if (params?.page) q.set("page", String(params.page));
  if (params?.limit) q.set("limit", String(params.limit));
  const base = apiBaseHost();
  const prefix = base ? `${base}/api` : "/api";
  const url = `${prefix}/v1/notifications${q.toString() ? `?${q.toString()}` : ""}`;
  return getJSON<Paginated<NotificationDTO>>(url, params?.token);
}

export async function markNotificationRead(
  id: string,
  token?: string
): Promise<{ ok: boolean }> {
  if (!id) throw new Error("notification id لازم است");
  const base = apiBaseHost();
  const prefix = base ? `${base}/api` : "/api";
  return patchJSON<{ ok: boolean }>(`${prefix}/v1/notifications/${id}/read`, {}, token);
}

export async function deleteNotification(
  id: string,
  token?: string
): Promise<{ ok: boolean }> {
  if (!id) throw new Error("notification id لازم است");
  const base = apiBaseHost();
  const prefix = base ? `${base}/api` : "/api";
  return delJSON<{ ok: boolean }>(`${prefix}/v1/notifications/${id}`, token);
}

