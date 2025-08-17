'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * ELI5:
 * این صفحه اول فقط "اسم اپ" را نشان می‌دهد.
 * بعد از ~1.2 ثانیه، گزینه‌های «ثبت‌نام» و «ورود مهمان» با فِید ملایم ظاهر می‌شوند.
 * دکمه‌ها با رنگ‌های برند (var(--brand-1/2)) هماهنگ‌اند.
 */
export default function SplashPage() {
  const router = useRouter();
  const [showChoices, setShowChoices] = useState(false);

  // ELI5: تایمر ساده برای ظاهر شدن گزینه‌ها بعد از نمایش اسم اپ
  useEffect(() => {
    const t = setTimeout(() => setShowChoices(true), 1200);
    return () => clearTimeout(t);
  }, []);

  // ELI5: ثبت‌نام → مسیر را به صفحهٔ ثبت‌نام خودت تغییر بده
  const goToSignup = () => {
    // TODO: اگر مسیر ثبت‌نامت فرق دارد، عوض کن (مثلاً '/register' یا '/auth/signup')
    router.push('/auth/register');
  };

  // ELI5: مهمان → یه فلگ ساده می‌زنیم و می‌فرستیمش صفحهٔ اصلی/Jobs
  const continueAsGuest = () => {
    try {
      localStorage.setItem('guest', '1');
    } catch {}
    // TODO: اگر لندینگت فرق دارد، مسیر را عوض کن. مثلاً '/jobs' یا '/'
    router.push('/jobs');
  };

  return (
    <main className="min-h-screen grid place-items-center bg-slate-50 dark:bg-slate-900">
      <div className="w-full max-w-md text-center p-6">
        {/* نام اپ با گرادیان برند؛ اگر برند ست نشده بود، مرورگر خودش از رنگ‌های fallback استفاده می‌کند */}
        <h1
          className="font-black bg-clip-text text-transparent"
          style={{
            backgroundImage: 'linear-gradient(135deg, var(--brand-1), var(--brand-2))',
            fontSize: '2.25rem', // ~text-4xl
            lineHeight: 1.2,
          }}
        >
          Modeling App
        </h1>

        {/* زیرنویس خیلی کم‌رنگ (اختیاری) */}
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          خوش اومدی ✨
        </p>

        {/* بخش دکمه‌ها: با تاخیر فِید می‌شود */}
        <div
          className={`mt-8 transition-opacity duration-700 ease-out ${
            showChoices ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          <div className="flex flex-col gap-3 items-stretch">
            {/* دکمهٔ ثبت‌نام (CTA گرادیانی) */}
            <button
              onClick={goToSignup}
              className="inline-flex justify-center items-center h-12 rounded-xl text-white font-extrabold shadow-lg active:scale-[.98] transition"
              // ELI5: گرادیان با رنگ‌های برند، تا با سوییچر برند هماهنگ شود
              style={{ backgroundImage: 'linear-gradient(135deg, var(--brand-1), var(--brand-2))' }}
              aria-label="ثبت‌نام"
            >
              ثبت‌نام
            </button>

            {/* دکمهٔ ورود مهمان (Outline برند) */}
            <button
              onClick={continueAsGuest}
              className="inline-flex justify-center items-center h-12 rounded-xl bg-white font-bold active:scale-[.98] transition border"
              // ELI5: رنگ نوشته و بردر از برند می‌آید تا حس یک‌دست داشته باشد
              style={{
                color: 'var(--brand-1)',
                borderColor: 'color-mix(in srgb, var(--brand-1) 60%, #e2e8f0)',
              }}
              aria-label="ورود به‌صورت مهمان"
            >
              ورود به‌صورت مهمان
            </button>
          </div>

          {/* نکتهٔ کوچک UX (اختیاری): اگر قبلاً حساب داری… */}
          {/* <p className="mt-3 text-xs text-slate-500">
            حساب داری؟ <a className="underline" onClick={() => router.push('/auth/login')}>وارد شو</a>
          </p> */}
        </div>
      </div>
    </main>
  );
}
