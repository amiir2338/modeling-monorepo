'use client';
import { axiosInstance } from '../api/axios-instance';


import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * ELI5:
 * - کارت با radius=25px.
 * - فاصله‌ها: عنوان→فرم = 3px، بین همه فیلدها = 4px، قبل از دکمه‌ها = 4px، بین دکمه‌ها = 4px.
 * - ایمیل و موبایل LTR هستند اما متن راهنمایشان (placeholder) و متن داخل فیلد راست‌چین می‌شود.
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

  // 🎨 رنگ‌های برند
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

  // اعتبارسنجی
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
      const { data } = await axiosInstance.post('/v1/auth/register', {
          fullName: form.fullName.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          password: form.password,
        });

      setServerMsg('ثبت‌نام با موفقیت انجام شد. در حال انتقال…');
      setTimeout(() => router.push('/auth/otp'), 800); // مسیر ورود خودت را بگذار
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
          background: 'radial-gradient(1200px 350px at 50% -50px, #e8defb, transparent 70%)',
        }}
      />

      {/* کارت */}
      <section
        className="relative w-full bg-white shadow-[0_8px_28px_rgba(15,23,42,.06)]"
        style={{
          maxWidth: 680,
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

        {/* فاصله عنوان تا فرم = 3px */}
        <form
          className="grid grid-cols-1 sm:grid-cols-2"
          style={{ marginTop: 3, columnGap: 4, rowGap: 4 }} // gap-x/y = 4px
          onSubmit={onSubmit}
        >
          {/* ورودی‌ها—قد 52px، placeholder داخل فیلد */}
          <FieldInput
            placeholder="نام و نام خانوادگی"
            value={form.fullName}
            onChange={(v) => update('fullName', v)}
            error={errors.fullName}
          />

          <FieldInput
            placeholder="ایمیل"
            type="email"
            value={form.email}
            onChange={(v) => update('email', v)}
            error={errors.email}
            ltr
            alignRight // ⟵ متن/placeholder راست‌چین ولی فیلد LTR
          />

          <FieldInput
            placeholder="شماره موبایل"
            type="tel"
            value={form.phone}
            onChange={(v) => update('phone', v)}
            error={errors.phone}
            ltr
            alignRight // ⟵ متن/placeholder راست‌چین
            inputMode="numeric"
          />

          <FieldInput
            placeholder="رمز عبور (حداقل ۶ کاراکتر)"
            type="password"
            value={form.password}
            onChange={(v) => update('password', v)}
            error={errors.password}
          />

          <FieldInput
            placeholder="تکرار رمز عبور"
            type="password"
            value={form.confirm}
            onChange={(v) => update('confirm', v)}
            error={errors.confirm}
          />

          {/* چک‌باکس—فاصله‌ها مطابق 4px شبکه */}
          <div className="sm:col-span-2">
            <label
              className="flex items-center gap-2 text-sm"
              style={{
                border: `1px solid ${BRAND.border}`,
                borderRadius: 12,
                padding: '12px 14px',
              }}
            >
              <input
                type="checkbox"
                checked={form.accept}
                onChange={(e) => update('accept', e.target.checked)}
                className="w-4 h-4"
              />
              <span>
                قوانین و <b>شرایط</b> را مطالعه کرده و می‌پذیرم.
                {errors.accept && (
                  <span className="block text-rose-600 mt-1">{errors.accept}</span>
                )}
              </span>
            </label>
          </div>

          {/* پیام سرور (اگر بود) — با فاصله 4px نسبت به آیتم‌های اطراف */}
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

          {/* فاصله قبل از دکمه‌ها = 4px */}
          <div className="sm:col-span-2" style={{ marginTop: 4 }} />

          {/* دکمه‌ها—فاصله بین‌شان = 4px */}
          <div className="sm:col-span-2 flex flex-col items-center" style={{ gap: 4 }}>
            <button
              type="submit"
              disabled={busy}
              className="font-extrabold text-white active:scale-[.98] transition shadow-lg disabled:opacity-60"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                maxWidth: 300,
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
              onClick={() => router.push('/login')}
              className="font-bold bg-white active:scale-[.98] transition"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                maxWidth: 300,
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

/* ---------- FieldInput: ورودی بزرگ با placeholder داخلی ---------- */
function FieldInput(props: {
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  type?: React.HTMLInputTypeAttribute;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
  /** اگر true باشد، ورودی LTR می‌شود (برای ایمیل/شماره). */
  ltr?: boolean;
  /** اگر true باشد، متن/placeholder راست‌چین می‌شود حتی وقتی فیلد LTR است. */
  alignRight?: boolean;
}) {
  const {
    placeholder, value, onChange, error,
    type = 'text', inputMode, ltr, alignRight,
  } = props;

  const style: React.CSSProperties = {
    height: 52,
    borderRadius: 14,
    border: `1px solid ${error ? '#fecaca' : '#DCD8E8'}`,
    padding: '0 14px',
    background: '#fff',
    transition: 'box-shadow .15s, border-color .15s',
    boxShadow: error ? '0 0 0 3px rgba(244,63,94,.15)' : 'none',
    direction: ltr ? 'ltr' : 'rtl',
    // اگر alignRight فعال باشد، متن و placeholder راست‌چین می‌شود
    textAlign: alignRight ? 'right' : (ltr ? 'left' : 'right'),
  };

  return (
    <div className="sm:col-span-1">
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        className="w-full text-sm outline-none"
        style={style}
      />
      {error && <span className="block mt-1 text-xs text-rose-600">{error}</span>}
    </div>
  );
}

/* ---------- Helpers بدون any ---------- */
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
async function safeJson<T>(res: Response): Promise<T | null> {
  const text = await res.text();
  if (!text) return null;
  try { return JSON.parse(text) as T; } catch { return null; }
}
