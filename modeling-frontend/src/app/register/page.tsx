'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * ELI5:
 * - کارت با radius=25، فیلدهای ثبت‌نام، اعتبارسنجی فرانت،
 *   و دکمه‌های استایل‌دار هماهنگ با برند.
 */
type RegisterForm = {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  confirm: string;
  accept: boolean;
};

type Errors = Partial<Record<keyof RegisterForm, string>>;

export default function RegisterPage() {
  const router = useRouter();

  // 🎨 رنگ‌ها
  const BRAND = {
    primary: '#7D6CB2',
    accent: '#A68FDB',
    border: '#DCD8E8',
    textOnBrand: '#FFFFFF',
  };

  const [form, setForm] = useState<RegisterForm>({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirm: '',
    accept: false,
  });
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const [serverMsg, setServerMsg] = useState<string | null>(null);

  // اعتبارسنجی ساده
  const validate = (f: RegisterForm): Errors => {
    const e: Errors = {};
    if (!f.fullName.trim()) e.fullName = 'نام و نام خانوادگی الزامی است.';
    if (!f.email.trim()) e.email = 'ایمیل الزامی است.';
    else if (!/^\S+@\S+\.\S+$/.test(f.email)) e.email = 'فرمت ایمیل صحیح نیست.';
    if (!f.phone.trim()) e.phone = 'شماره موبایل الزامی است.';
    else if (!/^\d{10,15}$/.test(f.phone.replace(/[^\d]/g, ''))) e.phone = 'شماره موبایل معتبر وارد کنید.';
    if (f.password.length < 6) e.password = 'حداقل ۶ کاراکتر برای رمز لازم است.';
    if (f.confirm !== f.password) e.confirm = 'تکرار رمز با رمز یکسان نیست.';
    if (!f.accept) e.accept = 'پذیرش قوانین ضروری است.';
    return e;
  };

  const has = (k: keyof RegisterForm) => Boolean(errors[k]);
  const update = <K extends keyof RegisterForm>(key: K, value: RegisterForm[K]) =>
    setForm((p) => ({ ...p, [key]: value }));

  // ارسال فرم
  const onSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setServerMsg(null);
    const e = validate(form);
    setErrors(e);
    if (Object.keys(e).length) return;

    setBusy(true);
    try {
      const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';
      const endpoint = `${base}/auth/register`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: form.fullName.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          password: form.password,
        }),
      });

      if (!res.ok) {
        const data = await safeJson<{ message?: string }>(res);
        throw new Error(data?.message || 'ثبت‌نام انجام نشد.');
      }

      setServerMsg('ثبت‌نام با موفقیت انجام شد. در حال انتقال...');
      setTimeout(() => router.push('/auth/login'), 800);
    } catch (err: unknown) {
      setServerMsg(err instanceof Error ? err.message : 'خطای نامشخص رخ داد.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main dir="rtl" className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center px-4">
      {/* بک‌گراند لطیف */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-[40vh] pointer-events-none"
        style={{
          background: `radial-gradient(1200px 350px at 50% -50px, ${mix(BRAND.accent, '#ffffff', 0.2)}, transparent 70%)`,
        }}
      />

      {/* کارت */}
      <section
        className="relative w-full bg-white shadow-[0_8px_28px_rgba(15,23,42,.06)]"
        style={{
          maxWidth: 640,
          borderRadius: 25,
          border: `2px solid ${BRAND.border}`,
          padding: '32px 28px',
        }}
      >
        <h1
          className="text-center select-none"
          style={{
            color: BRAND.primary,
            fontWeight: 900,
            letterSpacing: '.3px',
            fontSize: 28,
            lineHeight: 1.2,
          }}
        >
          ثبت نام
        </h1>

        <form className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4" onSubmit={onSubmit}>
          <Field label="نام و نام خانوادگی" error={errors.fullName}>
            <input
              type="text"
              value={form.fullName}
              onChange={(e) => update('fullName', e.target.value)}
              className="w-full px-3 py-2 text-sm outline-none"
              style={inputStyle(has('fullName'), BRAND)}
              placeholder="مثلاً: علی رضایی"
            />
          </Field>

          <Field label="ایمیل" error={errors.email}>
            <input
              type="email"
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              className="w-full px-3 py-2 text-sm outline-none ltr"
              style={inputStyle(has('email'), BRAND)}
              placeholder="example@email.com"
            />
          </Field>

          <Field label="شماره موبایل" error={errors.phone}>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => update('phone', e.target.value)}
              className="w-full px-3 py-2 text-sm outline-none ltr"
              style={inputStyle(has('phone'), BRAND)}
              placeholder="09xxxxxxxxx"
              inputMode="numeric"
            />
          </Field>

          <Field label="رمز عبور" error={errors.password}>
            <input
              type="password"
              value={form.password}
              onChange={(e) => update('password', e.target.value)}
              className="w-full px-3 py-2 text-sm outline-none"
              style={inputStyle(has('password'), BRAND)}
              placeholder="حداقل ۶ کاراکتر"
            />
          </Field>

          <Field label="تکرار رمز" error={errors.confirm}>
            <input
              type="password"
              value={form.confirm}
              onChange={(e) => update('confirm', e.target.value)}
              className="w-full px-3 py-2 text-sm outline-none"
              style={inputStyle(has('confirm'), BRAND)}
              placeholder="تکرار رمز عبور"
            />
          </Field>

          {/* قوانین */}
          <div className="sm:col-span-2">
            <label
              className="flex items-start gap-2 text-sm"
              style={{
                border: `1px solid ${BRAND.border}`,
                borderRadius: 12,
                padding: '10px 12px',
              }}
            >
              <input
                type="checkbox"
                checked={form.accept}
                onChange={(e) => update('accept', e.target.checked)}
                className="mt-1"
              />
              <span>
                <b>قوانین و شرایط</b> را مطالعه کرده و می‌پذیرم.
                {errors.accept && (
                  <span className="block text-rose-600 mt-1">{errors.accept}</span>
                )}
              </span>
            </label>
          </div>

          {/* پیام سرور */}
          {serverMsg && (
            <div
              className="sm:col-span-2 text-sm rounded-xl p-3"
              style={{
                color: serverMsg.includes('موفق') ? '#047857' : '#b91c1c',
                background: serverMsg.includes('موفق') ? '#ecfdf5' : '#fef2f2',
                border: `1px solid ${serverMsg.includes('موفق') ? '#a7f3d0' : '#fecaca'}`,
              }}
            >
              {serverMsg}
            </div>
          )}

          {/* دکمه‌ها */}
          <div className="sm:col-span-2 flex flex-col items-center gap-3 mt-2">
            <button
              type="submit"
              disabled={busy}
              className="font-extrabold text-white active:scale-[.98] transition shadow-lg disabled:opacity-60"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                maxWidth: 260,
                height: 52,
                borderRadius: 25,
                padding: '0 24px',
                backgroundImage: `linear-gradient(180deg, ${BRAND.primary}, ${mix(BRAND.primary, BRAND.accent, 0.25)})`,
                color: BRAND.textOnBrand,
                boxShadow: '0 10px 24px rgba(15,23,42,.10)',
              }}
            >
              {busy ? 'در حال ثبت‌نام…' : 'ثبت نام'}
            </button>

            <button
              type="button"
              onClick={() => router.push('/auth/login')}
              className="font-bold bg-white active:scale-[.98] transition"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                maxWidth: 260,
                height: 52,
                borderRadius: 25,
                padding: '0 24px',
                border: `2px solid ${mix(BRAND.primary, '#e2e8f0', 0.35)}`,
                color: BRAND.primary,
                boxShadow: '0 1px 0 rgba(0,0,0,.02)',
              }}
            >
              حساب داری؟ ورود
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}

/* ---------- اجزای کوچک ---------- */

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm text-slate-800">{label}</label>
      {children}
      {error && <span className="text-xs text-rose-600">{error}</span>}
    </div>
  );
}

function inputStyle(hasError: boolean, BRAND: { border: string; primary: string }) {
  return {
    border: `1px solid ${hasError ? mix(BRAND.primary, '#fecaca', 0.5) : BRAND.border}`,
    borderRadius: 14,
    background: '#fff',
    transition: 'box-shadow .15s, border-color .15s',
    boxShadow: hasError ? '0 0 0 3px rgba(244,63,94,.15)' : 'none',
  } as React.CSSProperties;
}

/* ---------- Helpers (بدون any) ---------- */

function mix(a: string, b: string, t: number): string {
  const A = hexToRgb(a), B = hexToRgb(b);
  const r = Math.round(A.r + (B.r - A.r) * t);
  const g = Math.round(A.g + (B.g - A.g) * t);
  const bl = Math.round(A.b + (B.b - A.b) * t);
  return rgbToHex(r, g, bl);
}
function hexToRgb(hex: string) {
  const m = hex.replace('#', '');
  const v = m.length === 3 ? m.split('').map((x) => x + x).join('') : m;
  const n = parseInt(v, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
function rgbToHex(r: number, g: number, b: number) {
  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/** JSON را ایمن می‌خواند؛ خروجی تایپ‌شده و بدون any. */
async function safeJson<T>(res: Response): Promise<T | null> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}
