'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * ELI5:
 * - اول اسم اپ نمایش داده می‌شود؛ بعد از 1.2s کارت دکمه‌ها با فید/اسلاید ظاهر می‌شود.
 * - همه‌چیز داخل «کارت» گرد با سایه‌ی لطیف است.
 * - دکمه‌ها دقیقاً مثل CTA فرم قبلی‌اند (قد 48px، radius ~14px، فونت بولد):
 *    • ثبت‌نام = گرادیان برند   • ورود مهمان = Outline برند
 * - هیچ وابستگی به CSS خارجی ندارد و با هر CSS سراسری تداخلی پیدا نمی‌کند.
 */
export default function SplashPage() {
  const router = useRouter();
  const [showChoices, setShowChoices] = useState(false);

  // 🎨 رنگ‌های سازمانی (از لوگو)
  const BRAND = {
    primary: '#7D6CB2',  // رنگ اصلی
    accent:  '#A68FDB',  // رنگ مکمل گرادیان
    border:  '#E7E5EF',  // رنگ پیشنهادی بوردر کارت
    textOnBrand: '#FFFFFF',
  };

  // ELI5: بعد از کمی مکث، کارت دکمه‌ها نمایان شود (افکت ورود)
  useEffect(() => {
    const t = setTimeout(() => setShowChoices(true), 1200);
    return () => clearTimeout(t);
  }, []);

  // مسیرها را مطابق پروژهٔ خودت تغییر بده
  const goToSignup = () => router.push('/auth/register'); // TODO: مسیر واقعی ثبت‌نام
  const continueAsGuest = () => {
    try { localStorage.setItem('guest', '1'); } catch {}
    router.push('/jobs'); // TODO: صفحهٔ لندینگ مهمان
  };

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center px-4">
      {/* بک‌گراند لطیف بالای صفحه (اختیاری) */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-[40vh] pointer-events-none"
        style={{
          background:
            `radial-gradient(1200px 350px at 50% -50px, ${mix(BRAND.accent, '#ffffff', 0.2)}, transparent 70%)`,
        }}
      />

      {/* کارت مرکزی که همه‌چیز داخل آن است */}
      <div
        className={`relative w-full max-w-md bg-white border rounded-2xl shadow-[0_8px_28px_rgba(15,23,42,.06)] p-6 sm:p-7 transition-all duration-700
          ${showChoices ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
        style={{ borderColor: BRAND.border }}
      >
        {/* عنوان با گرادیان برند */}
        <h1
          className="text-center font-black bg-clip-text text-transparent select-none"
          style={{
            backgroundImage: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})`,
            fontSize: '2rem', // ~32px
            lineHeight: 1.15,
          }}
        >
          ModelingStar
        </h1>

        {/* متن خوشامد کوتاه */}
        <p className="mt-2 text-center text-sm text-slate-600">
          به دنیای مدلینگ خوش اومدی ✨
        </p>

        {/* دکمه‌ها — جدا از هم با فاصله مناسب */}
        <div className="mt-6 flex flex-col items-center gap-4">
          {/* دکمهٔ ثبت‌نام (CTA گرادیانی) */}
          <button
            type="button"
            onClick={goToSignup}
            className="font-extrabold text-white shadow-lg active:scale-[.98] transition"
            // ELI5: این استایل‌ها دقیقا حس CTA فرم را می‌دهند
            style={{
              display: 'inline-flex',           // اگر جایی button{width:100%} داشته باشی، خنثی می‌کند
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',                    // موبایل تمام‌عرض
              maxWidth: 240,                    // دسکتاپ جمع‌وجور مثل فرم
              height: 48,                       // قد ثابت (مثل «ارسال برای بررسی»)
              borderRadius: 14,                 // گرد و «گوشتالو»
              padding: '0 22px',
              color: BRAND.textOnBrand,
              backgroundImage: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})`,
              boxShadow: '0 14px 30px rgba(15,23,42,.12)',
            }}
            aria-label="ثبت‌نام"
          >
            ثبت‌نام
          </button>

          {/* دکمهٔ ورود مهمان (Outline برند) */}
          <button
            type="button"
            onClick={continueAsGuest}
            className="font-bold bg-white active:scale-[.98] transition"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              maxWidth: 240,
              height: 48,
              borderRadius: 14,
              padding: '0 22px',
              color: BRAND.primary,
              border: `1px solid ${mix(BRAND.primary, '#e2e8f0', 0.4)}`, // بوردر ملایم برند
              boxShadow: '0 1px 0 rgba(0,0,0,.02)',
            }}
            onMouseEnter={(e) => {
              // ELI5: افکت هاور خیلی نرم
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = mix(BRAND.primary, '#ffffff', 0.06);
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#ffffff';
            }}
            aria-label="ورود به‌صورت مهمان"
          >
            ورود به‌صورت مهمان
          </button>
        </div>
      </div>
    </main>
  );
}

/* ===== Helpers (ELI5): یک میکس ساده رنگ که نیاز به کتابخانه ندارد ===== */
/** رنگ A و B را با نسبت t (0..1) میکس می‌کند و خروجی hex می‌دهد. */
function mix(a: string, b: string, t: number): string {
  const A = hexToRgb(a), B = hexToRgb(b);
  const r = Math.round(A.r + (B.r - A.r) * t);
  const g = Math.round(A.g + (B.g - A.g) * t);
  const bch = Math.round(A.b + (B.b - A.b) * t);
  return rgbToHex(r, g, bch);
}
function hexToRgb(hex: string) {
  const m = hex.replace('#', '');
  const v = m.length === 3
    ? m.split('').map((x) => x + x).join('')
    : m;
  const num = parseInt(v, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}
function rgbToHex(r: number, g: number, b: number) {
  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
