// src/lib/api/auth.ts
// 🟢 این فایل مسئول ارتباط با بک‌اند برای عملیات ثبت‌نام، ورود، گرفتن اطلاعات کاربر و خروج است.
// 🟢 به‌جای اینکه هرجا بخوایم axios صدا بزنیم، همه چیز اینجا جمع شده تا مرتب و یکدست باشه.

import http from "@/lib/api/http"; // 🟢 همون شلنگ اصلی (Axios instance) که از http.ts ساختیم

// 🟢 نقش‌های کاربر (client, model, admin)
export type Role = "client" | "model" | "admin";

// 🟢 شکل کلی اطلاعات کاربر (که سرور بهمون برمی‌گردونه)
export interface ApiUser {
  _id: string;
  email: string;
  role: Role;
  name?: string | null;
  avatar?: string | null;
  clientId?: string | null;
  modelId?: string | null;
}

// 🟢 جواب‌های استانداردی که سرور می‌ده
export interface ApiOk<T> {
  ok: true;
  data: T;
}
export interface ApiErr {
  ok: false;
  message: string;
}
export type ApiResult<T> = ApiOk<T> | ApiErr;

// 🟢 همه توی یک آبجکت export می‌شن
export const authApi = {
  /** 🟢 ثبت‌نام کاربر
   * به سرور می‌گه: ایمیل، پسورد و نقش کاربر (پیش‌فرض client)
   * اگر موفق بود، کوکی HttpOnly ست می‌شه
   */
  async register(email: string, password: string, role: Role = "client", name?: string) {
    const res = await http.post<ApiResult<{ user: ApiUser }>>(
      "/api/v1/auth/register",
      { email, password, role, name }
    );
    return res.data; // یا { ok: true, data: { user } } یا { ok: false, message }
  },

  /** 🟢 ورود کاربر
   * به سرور ایمیل و پسورد می‌دیم
   * سرور اگر درست بود کوکی HttpOnly ست می‌کنه
   * بعدش ما از /me وضعیت کاربر رو می‌گیریم
   */
  async login(email: string, password: string) {
    const res = await http.post<ApiResult<unknown>>(
      "/api/v1/auth/login",
      { email, password }
    );
    return res.data;
  },

  /** 🟢 گرفتن اطلاعات کاربر لاگین‌شده
   * اگر کوکی معتبر باشه، سرور اطلاعات کاربر رو می‌ده
   * اگر نباشه → خطای 401 می‌ده
   */
  async me() {
    const res = await http.get<ApiResult<{ user: ApiUser }>>("/api/v1/auth/me");
    return res.data;
  },

  /** 🟢 خروج کاربر
   * کوکی HttpOnly سمت سرور پاک می‌شه
   */
  async logout() {
    const res = await http.post<ApiResult<{ ok?: boolean }>>(
      "/api/v1/auth/logout",
      {}
    );
    return res.data;
  },
};
