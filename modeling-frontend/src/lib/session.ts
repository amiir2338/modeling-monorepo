// src/lib/session.ts
import http from '@/lib/api/http';

/* 🟢 ELI5: این فایل مسئول نشست (session) سمت کلاینت است.
   - login: ورود کاربر با ایمیل/پسورد → سرور کوکی HttpOnly ست می‌کند.
   - logout: خروج کاربر → کوکی پاک می‌شود.
   - me: اطلاعات کاربر جاری (از روی کوکی) را برمی‌گرداند.
   - isLoggedIn: یک چک سریع برای اینکه کاربر وارد شده یا نه.
*/

export type Role = 'client' | 'model' | 'admin';

export interface ApiUser {
  _id: string;
  email: string;
  role: Role | string;
  name?: string | null;
  avatar?: string | null;
  clientId?: string | null;
  modelId?: string | null;
}

export interface MeResOk {
  ok: true;
  data: { user: ApiUser };
}
export interface MeResFail {
  ok: false;
  message?: string;
}
export type MeResponse = MeResOk | MeResFail;

/* 🟢 گرفتن کاربر فعلی از سرور */
export async function fetchMe(): Promise<ApiUser | null> {
  try {
    const res = await http.get<MeResponse>('/api/v1/auth/me', { withCredentials: true });
    if (res.data.ok && res.data.data?.user) {
      return res.data.data.user;
    }
    return null;
  } catch {
    return null;
  }
}

/* 🟢 ورود: سرور کوکی را می‌گذارد */
export async function login(email: string, password: string): Promise<ApiUser | null> {
  try {
    await http.post('/api/v1/auth/login', { email, password }, { withCredentials: true });
    return await fetchMe();
  } catch {
    return null;
  }
}

/* 🟢 خروج: کوکی پاک می‌شود */
export async function logout(): Promise<boolean> {
  try {
    await http.post('/api/v1/auth/logout', {}, { withCredentials: true });
    return true;
  } catch {
    return false;
  }
}

/* 🟢 چک سریع وضعیت ورود */
export async function isLoggedIn(): Promise<boolean> {
  const u = await fetchMe();
  return !!u;
}
