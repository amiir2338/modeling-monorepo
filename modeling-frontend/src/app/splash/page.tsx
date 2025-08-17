'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * ELI5:
 * - اسم اپ اول میاد؛ بعد از 1.2s کارت دکمه‌ها با فِید/اسلاید ظاهر میشه.
 * - کارت جمع‌وجور و وسط‌چین با سایه‌ی لطیف (حس همان فرم قبلی).
 * - دو دکمه کاملاً جدا و هم‌اندازه‌اند:
 *    - «ثبت‌نام» (CTA گرادیانی برند)
 *    - «ورود به‌صورت مهمان» (Outline برند)
 * - هیچ any توی کد نیست؛ CSS variables با تایپ درست ست می‌شن.
 */
export default function SplashPage() {
  const router = useRouter();
  const [showChoices, setShowChoices] = useState(false);

  // 🎨 پالت برند بر اساس لوگوت (می‌تونی هر وقت خواستی این هگزها رو عوض کنی)
  const BRAND = {
    primary: '#7D6CB2',       // --brand-1
    accent: '#A68FDB',        // --brand-2
    textOnBrand: '#FFFFFF',
    neutralBorder: '#E7E5EF',
  };

  // ✅ بدون any — برای CSS Variables از React.CSSProperties استفاده می‌کنیم
  const brandVars: React.CSSProperties = {
    ['--brand-1']: BRAND.primary,
    ['--brand-2']: BRAND.accent,
    ['--text-on-brand']: BRAND.textOnBrand,
    ['--neutral-border']: BRAND.neutralBorder,
  } as React.CSSProperties;

  useEffect(() => {
    const t = setTimeout(() => setShowChoices(true), 1200);
    return () => clearTimeout(t);
  }, []);

  // مسیرها را متناسب پروژه‌ات تنظیم کن
  const goToSignup = () => router.push('/auth/register'); // TODO: اگر مسیر ثبت‌نام فرق دارد، عوضش کن
  const continueAsGuest = () => {
    try { localStorage.setItem('guest', '1'); } catch {}
    router.push('/jobs'); // TODO: مسیر لندینگ مهمان
  };

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-900" style={brandVars}>
      {/* پس‌زمینه گرادیانی لطیف بالای صفحه */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-[40vh] pointer-events-none"
        style={{
          background:
            'radial-gradient(1200px 350px at 50% -50px, color-mix(in srgb, var(--brand-2) 20%, #ffffff), transparent 70%)',
        }}
      />

      {/* کانتینر مرکزی */}
      <div className="relative grid place-items-center min-h-screen px-4">
        <div className="w-full flex flex-col items-center">
          {/* تیتر گرادیانی */}
          <h1
            className="text-center font-black bg-clip-text text-transparent select-none transition duration-700 ease-out"
            style={{
              backgroundImage: 'linear-gradient(135deg, var(--brand-1), var(--brand-2))',
              fontSize: '2rem', // ~32px
              lineHeight: 1.15,
              transform: showChoices ? 'translateY(0)' : 'translateY(6px)',
              opacity: showChoices ? 1 : 0,
            }}
          >
            ModelingStar
          </h1>

          {/* زیرتیتر با فاصله‌ی منطقی از کارت */}
          <p
            className="mt-2 text-center text-[13px] text-slate-600 transition duration-700"
            style={{ opacity: showChoices ? 1 : 0 }}
          >
            به دنیای مدلینگ خوش اومدی ✨
          </p>

          {/* کارت دکمه‌ها */}
          <div
            className="mt-4 transition-all duration-700 ease-out"
            style={{
              opacity: showChoices ? 1 : 0,
              transform: showChoices ? 'translateY(0)' : 'translateY(8px)',
            }}
          >
            <div
              className="bg-white rounded-2xl shadow-[0_8px_28px_rgba(15,23,42,.06)] border p-5 sm:p-6"
              style={{
                borderColor: 'var(--neutral-border)',
                // ELI5: کارت جمع‌وجور—عرض ثابت روی دسکتاپ، فول‌ویدث روی موبایل
                maxWidth: 420,
                width: '100%',
              }}
            >
              <div className="flex flex-col items-center gap-3">
                {/* دکمهٔ ثبت‌نام (CTA گرادیانی) — هم‌اندازه با مهمان */}
                <button
                  type="button"
                  onClick={goToSignup}
                  className="rounded-xl text-white font-extrabold shadow-lg active:scale-[.98] transition w-full sm:w-[240px]"
                  style={{
                    display: 'inline-flex',         // ELI5: جلوی width:100% سراسری را می‌گیرد
                    height: '48px',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundImage: 'linear-gradient(135deg, var(--brand-1), var(--brand-2))',
                  }}
                  aria-label="ثبت‌نام"
                >
                  ثبت‌نام
                </button>

                {/* دکمهٔ ورود مهمان (Outline برند) — هم‌اندازه با ثبت‌نام */}
                <button
                  type="button"
                  onClick={continueAsGuest}
                  className="rounded-xl bg-white font-bold active:scale-[.98] transition border shadow-sm w-full sm:w-[240px]"
                  style={{
                    display: 'inline-flex',
                    height: '48px',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--brand-1)',
                    borderColor: 'color-mix(in srgb, var(--brand-1) 60%, #e2e8f0)',
                  }}
                  aria-label="ورود به‌صورت مهمان"
                >
                  ورود به‌صورت مهمان
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
