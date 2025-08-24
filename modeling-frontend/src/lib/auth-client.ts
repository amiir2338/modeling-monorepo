// src/lib/auth-client.ts
// ✅ یکسان‌سازی لاگین/ثبت‌نام با بک‌اند (بدون OTP)
// - همه URLها از NEXT_PUBLIC_API_BASE (مثل http://localhost:4000/api) استفاده می‌کنند
// - توکن در localStorage با کلید 'access_token' ذخیره می‌شود

const API_BASE =
  (process.env.NEXT_PUBLIC_API_BASE
    ?? process.env.NEXT_PUBLIC_API_URL
    ?? process.env.NEXT_PUBLIC_API_BASE_URL
    ?? 'http://localhost:4000/api').replace(/\/+$/, '');

type LoginResult = { ok: boolean; token?: string; message?: string };

export async function loginUser(email: string, password: string): Promise<LoginResult> {
  try {
    const res = await fetch(`${API_BASE}/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const msg = await safeError(res);
      return { ok: false, message: msg || 'Login failed' };
    }
    const data = await res.json();
    const token = data?.token as string | undefined;
    if (token) {
      try { localStorage.setItem('access_token', token); } catch {}
      return { ok: true, token };
    }
    return { ok: false, message: 'No token returned' };
  } catch (e: any) {
    return { ok: false, message: e?.message || 'Network error' };
  }
}

export async function registerUser(email: string, password: string, name?: string, role: 'model'|'client'|'admin'='model'): Promise<LoginResult> {
  try {
    const res = await fetch(`${API_BASE}/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name, role }),
    });
    if (!res.ok) {
      const msg = await safeError(res);
      return { ok: false, message: msg || 'Register failed' };
    }
    const data = await res.json();
    const token = data?.token as string | undefined;
    if (token) {
      try { localStorage.setItem('access_token', token); } catch {}
      return { ok: true, token };
    }
    return { ok: false, message: 'No token returned' };
  } catch (e: any) {
    return { ok: false, message: e?.message || 'Network error' };
  }
}

export function logout(): void {
  try { localStorage.removeItem('access_token'); } catch {}
}

export function login(token: string): void {
  try { localStorage.setItem('access_token', token); } catch {}
}

export function getToken(): string | null {
  try { return localStorage.getItem('access_token'); } catch { return null; }
}

// helpers
async function safeError(res: Response): Promise<string|undefined> {
  try {
    const err = await res.json();
    return err?.message;
  } catch {
    try { return await res.text(); } catch { return undefined; }
  }
}
