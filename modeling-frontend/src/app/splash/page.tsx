'use client';

import { CSSProperties, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * ELI5:
 * این صفحه اول فقط اسم اپ را نشان می‌دهد.
 * بعد از ~1.2s دوتا دکمه با فید/اسلاید ملایم ظاهر می‌شوند.
 * رنگ‌ها از پالت برند (بر اساس لوگویی که دادی) می‌آید.
 * چون ممکنه globals.css هنوز ست نشده باشد، همین صفحه
 * CSS Variables را لوکال روی <main> تزریق می‌کند تا همه‌چیز حتماً کار کند.
 */
export default function SplashPage() {
  const router = useRouter();
  const [showChoices, setShowChoices] = useState(false);

  // 🎨 پالت برند بر اساس لوگو
  const BRAND = {
    primary: '#7D6CB2',  // --brand-1
    accent:  '#A68FDB',  // --brand-2
    textOnBrand: '#FFFFFF',
  };

  // ELI5: این استایل را روی <main> می‌ریزیم تا CSS vars لوکال ست شود
  const brandVars: CSSProperties = {
    ['--brand-1' as any]: BRAND.primary,
    ['--brand-2' as any]: BRAND.accent,
    ['--text-on-brand' as any]: BRAND.textOnBrand,
  };

  // بعد از کمی تاخیر گزینه‌ها را نشان بده
  useEffect(() => {
    const t = setTimeout(() => setShowChoices(true), 1200);
    return () => clearTimeout(t);
  }, []);

  // مسیرها را اگر متفاوت است، اینجا عوض کن
  const goToSignup = () => router.push('/auth/register'); // TODO: مسیر واقعی ثبت‌نامت
  const continueAsGuest = () => {
    try { localStorage.setItem('guest', '1'); } catch {}
    router.push('/jobs'); // TODO: صفحهٔ لندینگ مهمان
  };

  return (
    <main
      className="min-h-screen grid place-items-center bg-slate-50 dark:bg-slate-900 px-4"
      style={brandVars}
    >
      <div className="w-full max-w-md text-center">
        {/* هدر/لوگو با گرادیان برند + انیمیشن ورود */}
        <h1
          className={`font-black bg-clip-text text-transparent select-none transition duration-700 ease-out
                      translate-y-2 opacity-0 animate-[none]`}
          style={{
            backgroundImage: 'linear-gradient(135deg, var(--brand-1), var(--brand-2))',
            fontSize: '2.5rem', // ~text-4xl/5xl
            lineHeight: 1.15,
            // ELI5: ترفند ساده برای فیداین: وقتی choices ظاهر شوند، اسم هم به حالت پایدار برود
            ...(showChoices ? { transform: 'translateY(0)', opacity: 1 } : {}),
          }}
        >
          ModelingStar
        </h1>

        {/* توضیح خیلی کوتاه (اختیاری) */}
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">به دنیای مدلینگ خوش اومدی ✨</p>

        {/* باکس دکمه‌ها: جدا از هم + استایل مطابق فرم قبلی */}
        <div
          className={`mt-10 transition-all duration-700 ease-out ${
            showChoices ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3 pointer-events-none'
          }`}
        >
          <div className="flex flex-col gap-4">
            {/* دکمه CTA (ثبت‌نام) — پر و گرادیانی */}
            <button
              onClick={goToSignup}
              className="h-12 rounded-xl text-white font-extrabold shadow-lg active:scale-[.98] transition"
              style={{ backgroundImage: 'linear-gradient(135deg, var(--brand-1), var(--brand-2))' }}
              aria-label="ثبت‌نام"
            >
              ثبت‌نام
            </button>

            {/* دکمه Outline (ورود مهمان) — جدا و هم‌خانواده با فرم قبلی */}
            <button
              onClick={continueAsGuest}
              className="h-12 rounded-xl bg-white font-bold active:scale-[.98] transition border shadow-sm"
              style={{
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
    </main>
  );
}
