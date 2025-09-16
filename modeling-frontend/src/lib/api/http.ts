// src/lib/api/http.ts
/**
 * ELI5: این فایل پل ارتباطی فرانت (Next.js) ↔ بک‌اند (Nest/Express) است.
 * - baseURL = '/api' (rewrite/proxy توسط Next انجام می‌شود)
 * - withCredentials: true (کوکی access_token همراه تمام درخواست‌ها)
 * - بدون Authorization header دستی (بک‌اند کوکی را می‌خواند)
 * - unwrap<T> پاسخ استاندارد { ok, data, message } را تمیز باز می‌کند
 */

import axios, {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
} from 'axios';
import { getApiBase } from '@/lib/env';

export interface ApiEnvelope<T = unknown> {
  ok: boolean;
  data?: T;
  message?: string;
}

/* utils: type guards (بدون any) */
function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null;
}
function isApiEnvelopeLike(x: unknown): x is ApiEnvelope<unknown> {
  return isRecord(x) && 'ok' in x;
}

/* baseURL normalization
   Reason: when running in the browser we want same-origin requests like
   `/api/v1/...` so Next's rewrite/proxy will handle them. Returning '/api'
   here causes callers that already include '/api' to become '/api/api/...'.
   Default to empty string (same origin) when no env var is provided. */
const BASE_URL = getApiBase();

// Use same-origin in the browser to ensure cookies (HttpOnly) are stored and
// sent correctly. On the server (SSR) use the absolute backend URL so server
// side requests can reach the API directly.
const isBrowser = typeof window !== 'undefined';
const axiosBase = isBrowser ? '' : BASE_URL || 'http://localhost:4000';

/* axios instance */
const http: AxiosInstance = axios.create({
  baseURL: axiosBase,
  withCredentials: true,
  timeout: 15000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

/* request interceptor: حذف هر Authorization دستی */
http.interceptors.request.use((config) => {
  if (config.headers && 'Authorization' in config.headers) {
    delete (config.headers as Record<string, unknown>)['Authorization'];
  }
  config.withCredentials = true;
  return config;
});

/* response interceptor: فقط هندل تمیز خطاهای شبکه و HTML */
http.interceptors.response.use(
  (res) => res,
  (error: AxiosError<unknown>) => {
    const resp: AxiosResponse<unknown> | undefined = error.response;
    const data = resp?.data;

    // اگر پاسخ HTML بود (مثلاً 404 از Next)، پیام دوستانه بده
    const contentType = (resp?.headers?.['content-type'] as string | undefined) ?? '';
    const looksLikeHTML =
      typeof data === 'string' && /<\s*(!doctype|html|head|body)\b/i.test(data);
    if (contentType.includes('text/html') || looksLikeHTML) {
      return Promise.reject(new Error('خطا در ارتباط با سرور. تنظیم مسیر API را بررسی کنید.'));
    }

    if (error.code === 'ECONNABORTED') {
      return Promise.reject(new Error('⏳ درخواست تایم‌اوت شد.'));
    }
    if (error.message === 'Network Error') {
      return Promise.reject(new Error('🌐 اتصال برقرار نشد. سرور در دسترس است؟'));
    }

    // استخراج پیام امن، بدون any
    let msg = 'خطای نامشخص رخ داد';
    if (typeof data === 'string' && data.trim()) {
      msg = data;
    } else if (isApiEnvelopeLike(data) && typeof data.message === 'string' && data.message.trim()) {
      msg = data.message;
    } else if (resp?.status) {
      msg = `خطای ${resp.status}`;
    }

    return Promise.reject(new Error(msg));
  }
);

/* unwrap: بازکردن پاکت {ok,data,message} به شیء T */
async function unwrap<T>(p: Promise<AxiosResponse<ApiEnvelope<T>>>): Promise<T> {
  const res = await p;
  const payload = res.data;
  if (isApiEnvelopeLike(payload) && payload.ok) {
    if (typeof payload.data === 'undefined') {
      throw new Error('پاسخ معتبر نیست: data یافت نشد.');
    }
    return payload.data as T;
  }
  const message =
    (isApiEnvelopeLike(payload) && typeof payload.message === 'string' && payload.message) ||
    'درخواست ناموفق بود';
  throw new Error(message);
}

/* متدهای کمکی تایپ‌دار: خروجی همیشه T تمیز */
export function apiGet<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  return unwrap<T>(http.get<ApiEnvelope<T>>(url, config));
}
export function apiPost<T>(url: string, body?: unknown, config?: AxiosRequestConfig): Promise<T> {
  return unwrap<T>(http.post<ApiEnvelope<T>>(url, body, config));
}
export function apiPatch<T>(url: string, body?: unknown, config?: AxiosRequestConfig): Promise<T> {
  return unwrap<T>(http.patch<ApiEnvelope<T>>(url, body, config));
}
export function apiPut<T>(url: string, body?: unknown, config?: AxiosRequestConfig): Promise<T> {
  return unwrap<T>(http.put<ApiEnvelope<T>>(url, body, config));
}
export function apiDelete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  return unwrap<T>(http.delete<ApiEnvelope<T>>(url, config));
}

export default http;
