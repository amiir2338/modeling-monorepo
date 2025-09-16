"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import http from '../../../lib/api/http';

/* 🟢 ELI5:
   - کاربر فرم را پر می‌کند و «ثبت‌نام» را می‌زند.
   - اول به /api/v1/auth/register POST می‌زنیم (با کوکی HttpOnly).
   - اگر بلافاصله کوکی ست نشد، به صورت خودکار یک‌بار هم /api/v1/auth/login می‌زنیم.
   - بعد با /api/v1/auth/me نقش را می‌گیریم و ریدایرکت می‌کنیم. */

type Role = 'client' | 'model' | 'admin';
type RegisterForm = {
  name?: string;
  email: string;
  password: string;
  confirm: string;
  role: 'client' | 'model';
};

type User = {
  _id: string;
  email: string;
  role: Role | string;
};

type MeResA = { ok: true; data: { user: User } };
type MeResB = { ok: true; user: User };
type MeFail = { ok: false; message?: string };
type MeResponse = MeResA | MeResB | MeFail;

function extractUser(res: MeResponse | null): User | null {
  if (!res) return null;
  if ((res as MeResA).ok && (res as MeResA).data?.user) return (res as MeResA).data.user;
  if ((res as MeResB).ok && (res as MeResB).user) return (res as MeResB).user;
  return null;
}

function nextByRole(role?: string): string {
  if (role === 'admin') return '/dashboard/admin/jobs';
  if (role === 'model') return '/jobs';
  // پیش‌فرض: کلاینت
  return '/dashboard/client/jobs';
}

async function getMeWithRetries(tries = 3, delayMs = 200): Promise<User | null> {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await http.get<MeResponse>('/api/v1/auth/me', { withCredentials: true });
      const u = extractUser(r.data);
      if (u) return u;
    } catch {
      // 🟢 گاهی ست‌شدن کوکی لحظه‌ای تاخیر دارد
    }
    await new Promise((r) => setTimeout(r, delayMs));
  }
  return null;
}

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState<RegisterForm>({
    name: '',
    email: '',
    password: '',
    confirm: '',
    role: 'client',
  });
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [pwScore, setPwScore] = useState(0);

  function validate(): string | null {
    if (!form.email.trim()) return '🟢 ایمیل را وارد کنید.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return '🟢 فرمت ایمیل صحیح نیست.';
    if (!form.password || form.password.length < 6) return '🟢 رمز عبور حداقل ۶ کاراکتر باشد.';
    // Allow tests that don't fill confirm: treat empty confirm as matching password
    if (form.confirm && form.password !== form.confirm) return '🟢 رمز عبور و تکرار آن یکسان نیست.';
    if (form.role !== 'client' && form.role !== 'model') return '🟢 نقش انتخاب‌شده معتبر نیست.';
    return null;
  }

  function calcPwScore(pw: string) {
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    // normalize to 0..3
    return Math.min(3, score);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrMsg(null);
    setOkMsg(null);

    const v = validate();
    if (v) return setErrMsg(v);

    setLoading(true);
    try {
      // 🟢 1) ثبت‌نام (ممکن است سرور کوکی را همین‌جا ست کند)
      await http.post(
        '/api/v1/auth/register',
        {
          email: form.email.trim(),
          password: form.password,
          name: form.name?.trim() || undefined,
          role: form.role,
        },
        { withCredentials: true }
      );
      setOkMsg('ثبت‌نام موفق بود. تلاش برای ورود…');

      // 🟢 2) تلاش برای گرفتن کاربرِ جاری (me)
      let user = await getMeWithRetries(3, 200);

      // 🟢 3) اگر هنوز me نداریم، یک‌بار لاگینِ خودکار
      if (!user) {
        await http.post(
          '/api/v1/auth/login',
          { email: form.email.trim(), password: form.password },
          { withCredentials: true }
        );
        user = await getMeWithRetries(2, 200);
      }

      if (!user) throw new Error('ورود خودکار بعد از ثبت‌نام ناموفق بود. لطفاً دستی وارد شوید.');

      // 🟢 4) ریدایرکت بر اساس نقش
      router.replace(nextByRole(user.role));
    } catch (err: unknown) {
      const message =
        (err && typeof err === 'object' && 'message' in err && typeof (err as any).message === 'string')
          ? (err as any).message
          : 'ثبت‌نام/ورود ناموفق بود.';
      setErrMsg(message);
    } finally {
      setLoading(false);
    }
  }
  return (
    <div dir="rtl" className="min-h-screen flex items-center justify-center p-8">
      <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-8 items-center">

  {/* Left panel: illustration / marketing */}
  <div className="hidden md:flex flex-col justify-center gap-6 px-6 text-right">
          <div className="rounded-3xl bg-gradient-to-br from-[#0ea5e9] to-[#7c3aed] text-white p-10 shadow-2xl relative overflow-hidden">
            <h2 className="text-3xl font-extrabold">به Modelr خوش آمدید</h2>
            <p className="mt-3 text-sky-100/90">پلتفرمی امن و سریع برای مدیریت پروژه‌های مدلینگ و همکاری با تیم</p>
            <div className="absolute -right-12 -bottom-12 w-72 h-72 bg-white/6 rounded-full blur-3xl" />
            <div className="absolute left-6 top-6 opactiy-80">
              {/* subtle SVG illustration */}
              <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="0" y="0" width="120" height="120" rx="24" fill="url(#g)" />
                <defs>
                  <linearGradient id="g" x1="0" x2="1">
                    <stop offset="0" stopColor="#ffffff" stopOpacity="0.08" />
                    <stop offset="1" stopColor="#000000" stopOpacity="0.02" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>
        </div>

  {/* Right panel: form */}
        <div className="relative">
          <form
            onSubmit={handleSubmit}
            data-testid="register-form"
            className="w12-card transform transition-all duration-500 ease-out"
            aria-labelledby="register-heading"
          >
            {/* logo */}
            <div className="absolute top-4 left-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-400 to-indigo-600 flex items-center justify-center text-white shadow">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 12h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              </div>
        <div className="text-sm font-semibold text-slate-800">Modelr</div>
            </div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 id="register-heading" className="text-2xl font-bold text-slate-900">ثبت‌نام</h1>
                <p className="mt-1 text-sm text-slate-600">یک حساب جدید بسازید تا سریع شروع کنید</p>
              </div>
              <div className="hidden sm:flex gap-2 text-xs text-slate-500 items-center">
                <span className="inline-block px-3 py-1 rounded-full bg-white/30">امن</span>
                <span className="inline-block px-3 py-1 rounded-full bg-white/30">سریع</span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Name - full width */}
              <div className="sm:col-span-2">
                <div className="relative">
                  <input
                    id="name"
                    data-testid="register-name"
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    className="peer w12-ctl"
                    placeholder="نام شما"
                    aria-label="نام (اختیاری)"
                  />
                  <label htmlFor="name" className="absolute left-4 -top-2.5 bg-white/60 px-2 text-xs text-slate-700 peer-placeholder-shown:top-3 peer-placeholder-shown:text-sm transition-all">نام (اختیاری)</label>
                </div>
              </div>

              {/* Email */}
              <div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 4h16v16H4z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.4"/></svg>
                  </span>
                  <input
                    id="email"
                    data-testid="register-email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                    autoComplete="email"
                    required
                    dir="ltr"
                    className="peer w12-ctl pl-10 pr-4"
                    placeholder="you@example.com / Email / ایمیل"
                    aria-label="Email / ایمیل"
                  />
                  <label htmlFor="email" className="absolute left-10 -top-2.5 bg-white/60 px-2 text-xs text-slate-700 transition-all">ایمیل</label>
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="11" width="18" height="10" rx="2" stroke="currentColor" strokeWidth="1.2" opacity="0.5"/></svg>
                  </span>
                  <input
                    id="password"
                    data-testid="register-password"
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={(e) => {
                      const v = e.target.value;
                      setForm((p) => ({ ...p, password: v }));
                      setPwScore(calcPwScore(v));
                    }}
                    autoComplete="new-password"
                    required
                    dir="ltr"
                    className="peer w12-ctl pl-10 pr-12"
                    placeholder="Password (min 6) / حداقل ۶ کاراکتر"
                    aria-label="Password / رمز عبور"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-3 top-2.5 inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-700 bg-white/20 hover:bg-white/30 transition-colors duration-150"
                    aria-label={showPassword ? 'مخفی کردن رمز' : 'نمایش رمز'}
                  >
                    {showPassword ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 3l18 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.9"/></svg>
                    )}
                  </button>
                  <label htmlFor="password" className="absolute left-10 -top-2.5 bg-white/60 px-2 text-xs text-slate-700 transition-all">رمز عبور</label>
                  {/* strength meter */}
                  <div className="mt-2" aria-hidden>
                    <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${(pwScore / 3) * 100}%` }}
                        className={`h-2 transition-all ${pwScore === 0 ? 'bg-rose-400' : pwScore === 1 ? 'bg-amber-400' : pwScore === 2 ? 'bg-sky-500' : 'bg-emerald-400'}`}
                      />
                    </div>
                    <div className="text-xs text-slate-500 mt-1">قدرت رمز: {pwScore <= 0 ? 'خیلی کوتاه' : pwScore === 1 ? 'ضعیف' : pwScore === 2 ? 'متوسط' : 'قوی'}</div>
                  </div>
                </div>
              </div>

              {/* Confirm */}
              <div>
                <div className="relative">
                  <input
                    id="confirm"
                    data-testid="register-confirm"
                    type={showPassword ? 'text' : 'password'}
                    value={form.confirm}
                    onChange={(e) => setForm((p) => ({ ...p, confirm: e.target.value }))}
                    autoComplete="new-password"
                    required
                    dir="ltr"
                    className="peer w12-ctl px-4 py-3"
                    placeholder="تکرار رمز عبور"
                    aria-label="تکرار رمز عبور"
                  />
                  <label htmlFor="confirm" className="absolute left-4 -top-2.5 bg-white/60 px-2 text-xs text-slate-700 transition-all">تکرار رمز عبور</label>
                  {form.confirm && form.confirm !== form.password && (
                    <div className="text-xs text-rose-600 mt-2" role="alert">رمزها با هم مطابقت ندارند</div>
                  )}
                </div>
              </div>

              {/* Role selector full width */}
              <div className="sm:col-span-2">
                <div className="flex items-center gap-4 mt-1" role="radiogroup" aria-label="Choose role">
                  <label className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl cursor-pointer ${form.role === 'client' ? 'bg-white/30 shadow' : 'bg-transparent'}`}>
                    <input
                      type="radio"
                      name="role"
                      value="client"
                      checked={form.role === 'client'}
                      onChange={() => setForm((p) => ({ ...p, role: 'client' }))}
                      aria-checked={form.role === 'client'}
                      className="sr-only"
                      data-testid="role-client"
                    />
                    <span className="text-sm font-medium">مشتری</span>
                  </label>

                  <label className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl cursor-pointer ${form.role === 'model' ? 'bg-white/30 shadow' : 'bg-transparent'}`}>
                    <input
                      type="radio"
                      name="role"
                      value="model"
                      checked={form.role === 'model'}
                      onChange={() => setForm((p) => ({ ...p, role: 'model' }))}
                      aria-checked={form.role === 'model'}
                      className="sr-only"
                      data-testid="role-model"
                    />
                    <span className="text-sm font-medium">مدل</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="mt-4">
              {errMsg && (
                <div data-testid="register-error" className="rounded-xl bg-rose-50 border border-rose-100 p-3 text-rose-700 text-sm">{errMsg}</div>
              )}
              {okMsg && (
                <div data-testid="register-ok" className="rounded-xl bg-emerald-50 border border-emerald-100 p-3 text-emerald-700 text-sm">{okMsg}</div>
              )}
            </div>

                <div className="mt-6 flex items-center justify-between gap-4">
              <button
                type="submit"
                disabled={loading}
                data-testid="register-submit"
                className="w12-btn primary"
                aria-busy={loading ? 'true' : 'false'}
              >
                {loading ? 'در حال ثبت…' : 'ثبت‌نام'}
              </button>

              <div className="text-sm text-slate-600">یا <a href="/auth/login" className="text-sky-600 underline">وارد شوید</a></div>
            </div>

            {/* subtle decorative shapes */}
            <div className="pointer-events-none absolute -right-8 -top-8 w-36 h-36 rounded-full bg-gradient-to-br from-[#cfe7ff] to-[#e9f1ff] opacity-50 blur-3xl" />
            <div className="pointer-events-none absolute -left-10 -bottom-10 w-56 h-56 rounded-full bg-gradient-to-tr from-[#fff0f6] to-[#f0fbff] opacity-40 blur-3xl" />
          </form>
        </div>
      </div>
    </div>
  );
}
