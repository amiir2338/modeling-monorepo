'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * بدون any:
 * - CSS variables با تایپ درست ست می‌شوند (React.CSSProperties)
 * - دکمه‌ها کارت‌وار، جدا و استایل‌دار
 */
export default function SplashPage() {
  const router = useRouter();
  const [showChoices, setShowChoices] = useState(false);

  // پالت برند از لوگو
  const BRAND = {
    primary: '#7D6CB2',
    accent: '#A68FDB',
    textOnBrand: '#FFFFFF',
    neutralBorder: '#E7E5EF',
  };

  // ✅ بدون any — شیء style را به React.CSSProperties کست می‌کنیم
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

  const goToSignup = () => router.push('/auth/register'); // مسیر واقعی‌ات را بگذار
  const continueAsGuest = () => {
    try { localStorage.setItem('guest', '1'); } catch {}
    router.push('/jobs');
  };

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-900" style={brandVars}>
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-[40vh] pointer-events-none"
        style={{
          background:
            'radial-gradient(1200px 350px at 50% -50px, color-mix(in srgb, var(--brand-2) 20%, #ffffff), transparent 70%)',
        }}
      />
      <div className="relative grid place-items-center min-h-screen px-4">
        <div className="w-full max-w-sm mx-auto">
          <h1
            className="text-center font-black bg-clip-text text-transparent select-none transition duration-700 ease-out"
            style={{
              backgroundImage: 'linear-gradient(135deg, var(--brand-1), var(--brand-2))',
              fontSize: '2.25rem',
              lineHeight: 1.15,
              transform: showChoices ? 'translateY(0)' : 'translateY(6px)',
              opacity: showChoices ? 1 : 0,
            }}
          >
            ModelingStar
          </h1>

          <p
            className="mt-2 text-center text-sm text-slate-500 dark:text-slate-400 transition duration-700"
            style={{ opacity: showChoices ? 1 : 0 }}
          >
            به دنیای مدلینگ خوش اومدی ✨
          </p>

          <div
            className="mt-8 transition-all duration-700 ease-out"
            style={{
              opacity: showChoices ? 1 : 0,
              transform: showChoices ? 'translateY(0)' : 'translateY(8px)',
            }}
          >
            <div className="rounded-2xl border bg-white shadow-[0_8px_28px_rgba(15,23,42,.06)] border-[var(--neutral-border)] p-4 sm:p-5 text-center">
              {/* ثبت‌نام — CTA گرادیانی */}
              <button
                type="button"
                onClick={goToSignup}
                className="rounded-xl text-white font-extrabold shadow-lg active:scale-[.98] transition"
                style={{
                  display: 'inline-flex',
                  width: 'auto',
                  height: '48px',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 22px',
                  backgroundImage: 'linear-gradient(135deg, var(--brand-1), var(--brand-2))',
                }}
                aria-label="ثبت‌نام"
              >
                ثبت‌نام
              </button>

              <div className="h-3" />

              {/* ورود مهمان — Outline برند */}
              <button
                type="button"
                onClick={continueAsGuest}
                className="rounded-xl bg-white font-bold active:scale-[.98] transition border shadow-sm"
                style={{
                  display: 'inline-flex',
                  width: 'auto',
                  height: '48px',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 22px',
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
    </main>
  );
}
