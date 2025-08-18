'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * تغییرات طبق درخواست:
 * - padding کارت: 290px 35px
 * - عنوان modeling star: letter-spacing: 5.5px
 * - عنوان و متن خوش‌آمد را کمی بالاتر آوردیم (marginTop منفی روی کانتینر متن‌ها)
 * - فاصله دکمه‌ها: 5px دقیق
 */
export default function SplashPage() {
  const router = useRouter();
  const [show, setShow] = useState(false);

  // 🎨 پالت
  const BRAND = {
    primary: '#7D6CB2',
    accent: '#A68FDB',
    border: '#DCD8E8',
    textOnBrand: '#FFFFFF',
  };

  useEffect(() => {
    const t = setTimeout(() => setShow(true), 300);
    return () => clearTimeout(t);
  }, []);

  const goToSignup = () => router.push('/register'); // مسیر ثبت‌نام واقعی خودت
  const continueAsGuest = () => {
    try { localStorage.setItem('guest', '1'); } catch {}
    router.push('/jobs'); // مسیر مهمان واقعی خودت
  };

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center px-4 relative">
      {/* بک‌گراند لطیف بالا */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-[40vh] pointer-events-none"
        style={{
          background: `radial-gradient(1200px 350px at 50% -50px, ${mix(BRAND.accent, '#ffffff', 0.2)}, transparent 70%)`,
        }}
      />

      {/* کارت مرکزی */}
      <section
        className={`relative w-full bg-white shadow-[0_8px_28px_rgba(15,23,42,.06)] transition-all duration-700
                    ${show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
        style={{
          maxWidth: 560,
          borderRadius: 25,
          border: `2px solid ${BRAND.border}`,
          padding: '290px 35px', // ← طبق درخواست
        }}
      >
        {/* کانتینر متن‌ها را کمی بالا می‌آوریم */}
        <div style={{ marginTop: -80 }}>
          {/* عنوان اصلی */}
          <h1
            className="text-center select-none"
            style={{
              color: BRAND.primary,
              fontWeight: 900,
              letterSpacing: '5.5px', // ← طبق درخواست
              textTransform: 'uppercase',
              fontSize: 36,
              lineHeight: 1.15,
              marginBottom: 10,
            }}
          >
            modeling star
          </h1>

          {/* متن خوش‌آمد */}
          <p
            className="text-center"
            style={{ fontWeight: 800, color: '#0F172A', fontSize: 18, marginBottom: 40 }}
          >
            به مدلینگ خوش آمدید
          </p>
        </div>

        {/* دکمه‌ها با فاصله دقیق 5px */}
        <div className="flex flex-col items-center" style={{ gap: '5px' }}>
          {/* ثبت نام — پر (بنفش) */}
          <button
            type="button"
            onClick={goToSignup}
            className="font-extrabold text-white active:scale-[.98] transition shadow-lg"
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
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.filter = 'saturate(1.05)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.filter = 'saturate(1)'; }}
            aria-label="ثبت نام"
          >
            ثبت نام
          </button>

          {/* ورود مهمان — اوت‌لاین */}
          <button
            type="button"
            onClick={continueAsGuest}
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
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = mix(BRAND.primary, '#ffffff', 0.06); }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#ffffff'; }}
            aria-label="ورود مهمان"
          >
            ورود مهمان
          </button>
        </div>
      </section>
    </main>
  );
}

/* ===== Helpers ===== */
function mix(a: string, b: string, t: number): string {
  const A = hexToRgb(a), B = hexToRgb(b);
  const r = Math.round(A.r + (B.r - A.r) * t);
  const g = Math.round(A.g + (B.g - A.g) * t);
  const bl = Math.round(A.b + (B.b - A.b) * t);
  return rgbToHex(r, g, bl);
}
function hexToRgb(hex: string) {
  const m = hex.replace('#', '');
  const v = m.length === 3 ? m.split('').map(x => x + x).join('') : m;
  const n = parseInt(v, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
function rgbToHex(r: number, g: number, b: number) {
  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
