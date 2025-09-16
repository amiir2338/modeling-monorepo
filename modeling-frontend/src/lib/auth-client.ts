// src/lib/auth-client.ts
import http, { getJSON, postJSON } from "@/lib/http";

/**
 * مسیرهای پیش‌فرض OTP (در صورت تفاوت در بک‌اندت، تغییر بده)
 * مثلا: /api/v1/auth/otp/request  و  /api/v1/auth/otp/verify
 */
const OTP_REQUEST_PATH = "/api/v1/auth/request-otp";
const OTP_VERIFY_PATH  = "/api/v1/auth/verify-otp";

/** شکل‌های رایج پاسخ در بک‌اندهای مختلف */
type OTPRequestResponse = {
  ok?: boolean;
  message?: string;
  /** اگر rate-limit یا expire-time بده */
  ttl?: number;
  [k: string]: any;
};

type OTPVerifyResponse = {
  ok?: boolean;
  message?: string;
  token?: string;
  access_token?: string;
  data?: { token?: string; access_token?: string };
  /** گاهی user هم برمی‌گردد */
  user?: any;
  [k: string]: any;
};

/** یکسان‌سازی توکن در پاسخ‌های مختلف */
function extractToken(res: OTPVerifyResponse | undefined | null): string | null {
  if (!res) return null;
  // حالت‌های متداول
  if (typeof res.access_token === "string") return res.access_token;
  if (typeof res.token === "string") return res.token;
  if (res.data && typeof res.data.access_token === "string") return res.data.access_token;
  if (res.data && typeof res.data.token === "string") return res.data.token;
  return null;
}

/**
 * درخواست ارسال کد OTP به شماره
 * - phone: شماره موبایل (با یا بدون 0 / +98، بسته به بک‌اندت)
 * - optional payload: اگر بک‌اند پارامترهای اضافی می‌خواهد (channel, country, ...)، بده
 */
export async function requestOtp(
  phone: string,
  extra?: Record<string, any>
): Promise<OTPRequestResponse> {
  if (!phone) throw new Error("شماره موبایل معتبر وارد نشده است.");
  const body = { phone, ...(extra || {}) };
  // اگر دوست داری از http.post استفاده کنی: const { data } = await http.post(OTP_REQUEST_PATH, body);
  const data = await postJSON<OTPRequestResponse, typeof body>(OTP_REQUEST_PATH, body, {
    withCredentials: true,
  });
  // می‌تونی بر اساس data.ok یا message پیام بدهی
  return data || { ok: true };
}

/**
 * تایید کد OTP
 * - خروجی: token (در صورت بازگشت از سرور). اگر سرور کوکی HttpOnly می‌گذارد، ممکن است token خالی باشد.
 * - در هر دو حالت (token یا cookie) کاربر لاگین فرض می‌شود.
 */
export async function verifyOtp(
  phone: string,
  code: string,
  extra?: Record<string, any>
): Promise<string> {
  if (!phone) throw new Error("شماره موبایل نامعتبر است.");
  if (!/^[0-9]{4,8}$/.test(code)) throw new Error("کد تایید نامعتبر است.");

  const body = { phone, code, ...(extra || {}) };
  // اگر بخواهیم full response داشته باشیم:
  // const { data } = await http.post<OTPVerifyResponse>(OTP_VERIFY_PATH, body, { withCredentials: true });
  const data = await postJSON<OTPVerifyResponse, typeof body>(OTP_VERIFY_PATH, body, {
    withCredentials: true,
  });

  const token = extractToken(data);
  // اگر بک‌اندت با کوکی کار می‌کند، ممکن است token ندهد—اشکالی ندارد.
  return token ?? "";
}

/* ===== چند کمک‌تابع اختیاری، اگر لازم داشتی از همین فایل ایمپورت کن ===== */

/** نمونه: خروج از حساب (اگر روت داری) */
export async function logout(): Promise<void> {
  try {
    // اگر بک‌اندت روت logout دارد:
    await http.post("/api/v1/auth/logout", {}, { withCredentials: true });
  } catch {
    // نادیده بگیر
  }
  if (typeof window !== "undefined") {
    try { localStorage.removeItem("access_token"); } catch {}
  }
}

/** نمونه: گرفتن وضعیت کاربر لاگین */
export async function me<T = any>(): Promise<T | null> {
  try {
    const res = await http.get<T>("/api/v1/auth/me", { withCredentials: true });
    // اگر auth با کوکی ست شده باشد، همین کافی است
    return (res.data as T) ?? null;
  } catch {
    return null;
  }
}
