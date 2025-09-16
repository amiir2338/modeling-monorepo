"use client";

import { useState } from "react";
import http from "@/lib/api/http";

/* 🟢 ELI5: این صفحه برای تست سریع Auth است.
   - Register: کاربر تست می‌سازد
   - Login: ورود با همان کاربر (ست شدن کوکی HttpOnly)
   - Me: وضعیت نشست را از سرور می‌گیریم
   - Logout: خروج و پاک شدن کوکی
   هر دکمه نتیجه را در لاگ پایین نشان می‌دهد تا سریع عیب‌یابی کنی. */

/* ===== Types ===== */
type Role = "client" | "model" | "admin";

interface ApiUser {
  _id: string;
  email: string;
  role: Role | string;
  name?: string | null;
  avatar?: string | null;
  clientId?: string | null;
  modelId?: string | null;
}

interface ApiOk<T> { ok: true; data: T }
interface ApiErr { ok: false; message: string }
type ApiResult<T> = ApiOk<T> | ApiErr;

/* 🟢 خطا را بدون any به متن تبدیل می‌کند */
function errMsg(e: unknown): string {
  if (typeof e === "string") return e;
  if (e && typeof e === "object") {
    const withResp = e as { response?: { data?: unknown; status?: number }; message?: unknown };
    const d = withResp.response?.data;
    if (d && typeof d === "object" && "message" in d) {
      const m = (d as { message?: unknown }).message;
      if (typeof m === "string") return m;
    }
    if (typeof withResp.message === "string") return withResp.message;
  }
  return "خطای ناشناخته";
}

/* 🟢 تبدیل آبجکت به پیش‌نمایش کوتاه برای لاگ */
function preview(v: unknown): string {
  try {
    if (typeof v === "string") return v.length > 600 ? v.slice(0, 600) + "…" : v;
    const s = JSON.stringify(v);
    return s.length > 600 ? s.slice(0, 600) + "…" : s;
  } catch {
    return "";
  }
}

export default function AuthDebugPage() {
  const [log, setLog] = useState<string[]>([]);
  const [email, setEmail] = useState<string>(`test+${Date.now()}@example.com`);
  const [password, setPassword] = useState<string>("Passw0rd!");

  const pushLog = (line: string) =>
    setLog((old) => [...old, `[${new Date().toLocaleTimeString()}] ${line}`]);

  const register = async () => {
    try {
      // 🟢 کاربر جدید می‌سازد (سرور ممکن است همین‌جا کوکی ست کند)
      const res = await http.post<ApiResult<{ user: ApiUser }>>(
        "/api/v1/auth/register",
        { email, password, role: "client", name: "Debug User" },
        { withCredentials: true }
      );
      pushLog(`REGISTER status=${res.status}`);
      pushLog(preview(res.data));
    } catch (e: unknown) {
      pushLog(`REGISTER ERR: ${errMsg(e)}`);
    }
  };

  const loginWrong = async () => {
    try {
      // 🟢 تلاش با رمز اشتباه (باید 401 یا خطای اعتبارسنجی بدهد)
      const res = await http.post<ApiResult<unknown>>(
        "/api/v1/auth/login",
        { email, password: password + "-wrong" },
        { withCredentials: true }
      );
      pushLog(`LOGIN_WRONG status=${res.status} (expected 401)`);
      pushLog(preview(res.data));
    } catch (e: unknown) {
      pushLog(`LOGIN_WRONG ERR (expected): ${errMsg(e)}`);
    }
  };

  const loginOk = async () => {
    try {
      // 🟢 ورود صحیح → کوکی HttpOnly ست می‌شود
      const res = await http.post<ApiResult<{ user: ApiUser }>>(
        "/api/v1/auth/login",
        { email, password },
        { withCredentials: true }
      );
      pushLog(`LOGIN_OK status=${res.status}`);
      pushLog(preview(res.data));
    } catch (e: unknown) {
      pushLog(`LOGIN_OK ERR: ${errMsg(e)}`);
    }
  };

  const me = async () => {
    try {
      // 🟢 بررسی نشست فعال
      const res = await http.get<ApiResult<{ user: ApiUser }>>(
        "/api/v1/auth/me",
        { withCredentials: true }
      );
      pushLog(`ME status=${res.status}`);
      pushLog(preview(res.data));
    } catch (e: unknown) {
      pushLog(`ME ERR: ${errMsg(e)}`);
    }
  };

  const logout = async () => {
    try {
      // 🟢 خروج → کوکی پاک می‌شود
      const res = await http.post<ApiResult<{ ok?: boolean }>>(
        "/api/v1/auth/logout",
        {},
        { withCredentials: true }
      );
      pushLog(`LOGOUT status=${res.status}`);
      pushLog(preview(res.data));
    } catch (e: unknown) {
      pushLog(`LOGOUT ERR: ${errMsg(e)}`);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-4">
      <h1 className="text-xl font-semibold">Auth Debug</h1>

      <div className="grid gap-2">
        <input
          className="border rounded p-2"
          placeholder="ایمیل"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          className="border rounded p-2"
          placeholder="گذرواژه"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={register} className="bg-slate-600 text-white rounded px-3 py-2">
          Register
        </button>
        <button onClick={loginWrong} className="bg-orange-600 text-white rounded px-3 py-2">
          Login Wrong
        </button>
        <button onClick={loginOk} className="bg-blue-600 text-white rounded px-3 py-2">
          Login
        </button>
        <button onClick={me} className="bg-emerald-600 text-white rounded px-3 py-2">
          Me
        </button>
        <button onClick={logout} className="bg-red-600 text-white rounded px-3 py-2">
          Logout
        </button>
      </div>

      <pre className="border rounded p-3 whitespace-pre-wrap text-sm bg-gray-50 h-72 overflow-auto">
        {log.join("\n")}
      </pre>

      <p className="text-xs text-gray-500">
        🟢 نکته: کوکی HttpOnly از داخل JS قابل خواندن نیست؛ موفقیت درخواست‌ها یعنی کوکی درست ارسال می‌شود.
      </p>
    </div>
  );
}
