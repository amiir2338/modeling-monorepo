'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * ELI5 (خیلی ساده):
 * - این صفحه همون Intro شماست با ابعاد 430×932 (دقیقاً مثل SVG).
 * - ما «منطق» دکمه ورود مهمان رو اضافه کردیم که شما رو ببره /jobs.
 * - کارت سفید خودش container محتواست؛ متن/ورودی/دکمه داخل همون کارت قرار می‌گیرن
 *   تا هیچوقت زیر/روی هم اشتباه نرن.
 * - مختصات و اندازه‌ها ۱:۱ از SVG اومدن و حفظ شدن؛ فقط کل بوم با scale جمع/باز می‌شه
 *   تا روی موبایل سایز درست بشه.
 */
export default function IntroPage() {
  // state شماره صرفاً برای UI (طبق طرح شما)
  const [phone, setPhone] = useState('');

  // اسکیل کردن «کل بوم 430px» نسبت به عرض صفحه (بدون به‌هم‌ریختگی پیکسل‌ها)
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const applyScale = () => {
      const vw = Math.min(
        window.innerWidth,
        document.documentElement.clientWidth || window.innerWidth
      );
      setScale(Math.min(1, vw / 430));
    };
    applyScale();
    window.addEventListener('resize', applyScale);
    return () => window.removeEventListener('resize', applyScale);
  }, []);

  // هدایت کاربر مهمان به لیست فرصت‌ها
  const router = useRouter();
  const onGuest = (e: React.FormEvent) => {
    e.preventDefault();
    // ELI5: اینجا قراره بدون لاگین کامل، کاربر به بخش عمومی بره
    // هر محدودیتی که برای guest داری رو بعداً روی صفحات مقصد اعمال کن.
    router.push('/jobs');
  };

  return (
    <main className="min-h-screen w-full flex items-start justify-center bg-[#F1F1F1]">
      {/* بوم 430×932 که نسبت به عرض صفحه scale می‌شود */}
      <div
        className="relative"
        style={{
          width: 430,
          height: 932,
          transform: `scale(${scale})`,
          transformOrigin: 'top center',
          direction: 'rtl',
          isolation: 'isolate', // جلوگیری از تداخل لایه‌ها با والد
        }}
      >
        {/* پس‌زمینه‌ها (طبق SVG) */}
        <div
          className="absolute left-0 top-0"
          style={{ width: 430, height: 665, background: '#7D6CB2', zIndex: 0 }}
        />
        <div
          className="absolute left-0 top-[663px]"
          style={{ width: 430, height: 269, background: '#F1F1F1', zIndex: 0 }}
        />

        {/* تیتر بالا (MODELING STAR) */}
        <div className="absolute" style={{ top: 198, left: 92, zIndex: 1 }}>
          <span
            className="font-bold text-[29px]"
            style={{ color: '#E1E1E1', letterSpacing: '5.5px' }}
          >
            MODELING STAR
          </span>
        </div>

        {/* زیرتیتر (به دنیای مدلینگ خوش آمدید) */}
        <div className="absolute" style={{ top: 242, left: 140, zIndex: 1 }}>
          <span className="font-bold text-[13px]" style={{ color: '#DFDFDF' }}>
            به دنیای مدلینگ خوش آمدید
          </span>
        </div>

        {/* کارت سفید = container محتوا (بوردر+شَدو مطابق فیلتر SVG) */}
        <div
          className="absolute"
          style={{
            top: 332,
            left: 23,
            width: 383,
            height: 357,
            borderRadius: 39,
            background: '#FFFFFF',
            border: '1px solid #707070',
            boxShadow: '2px 5px 31px rgba(0,0,0,0.161)',
            zIndex: 1, // بالای پس‌زمینه، زیر محتوا
          }}
        >
          {/* برچسب داخل کارت */}
          <div
            className="absolute font-[800] text-[22px]"
            style={{
              // y = 440 - 332 = 108 , x = 134 - 23 = 111
              top: 108,
              left: 111,
              color: '#7D6CB2',
              whiteSpace: 'nowrap',
              zIndex: 2,
            }}
          >
            شماره خود را وارد کنید
          </div>

          {/* فرم: ورودی + دکمه (هر دو روی کارت) */}
          <form onSubmit={onGuest}>
            {/* ورودی شماره (ظاهر+ابعاد دقیق) */}
            <input
              type="tel"
              dir="ltr"
              inputMode="numeric"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="09xxxxxxxxx"
              aria-label="شماره موبایل"
              className="ph absolute text-center text-[21px] outline-none"
              style={{
                // y = 487 - 332 = 155 , x = 47 - 23 = 24
                top: 155,
                left: 24,
                width: 337,
                height: 58,
                borderRadius: 14,
                background: '#F1F1F1',
                border: '1px solid rgba(0,0,0,0.15)',
                color: '#111',
                zIndex: 2,
              }}
            />

            {/* دکمه «ورود مهمان» (ابعاد و موقعیت دقیق) */}
            <button
              type="submit"
              className="absolute font-[800] text-[22px]"
              style={{
                // y = 587 - 332 = 255 , x = 132 - 23 = 109
                top: 255,
                left: 109,
                width: 165,
                height: 58,
                borderRadius: 14,
                background: '#7D6CB2',
                color: '#FFFFFF',
                boxShadow: '0 2px 6px rgba(0,0,0,0.18)',
                zIndex: 2,
              }}
            >
              ورود&nbsp; مهمان
            </button>
          </form>
        </div>

        {/* استایل placeholder دقیقاً مثل SVG */}
        <style jsx>{`
          .ph::placeholder {
            color: rgba(0, 0, 0, 0.23);
          }
        `}</style>
      </div>
    </main>
  );
}
