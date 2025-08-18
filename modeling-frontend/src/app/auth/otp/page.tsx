'use client';
import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { verifyOtp, requestOtp } from '@/lib/auth-client';

/**
 * ELI5:
 * این صفحه کد ۶ رقمی را از کاربر می‌گیرد.
 * - ۶ اینپوت تک‌کاراکتری داریم (+ امکان paste کد کامل)
 * - بعد از تایید، توکن را از بک‌اند می‌گیریم و در localStorage ذخیره می‌کنیم.
 * - خطای فعلی به خاطر ref بود که نباید مقدار برگرداند؛ اینجا فیکس شده.
 */
export default function OtpPage() {
  const router = useRouter();
  const search = useSearchParams();
  const phone = search.get('phone') || '';

  const [cells, setCells] = useState<string[]>(['', '', '', '', '', '']);
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);
  const [timer, setTimer] = useState<number>(60);
  const [loading, setLoading] = useState<boolean>(false);

  // تایمر 60 ثانیه‌ای
  useEffect(() => {
    if (timer <= 0) return;
    const id = setTimeout(() => setTimer((t) => t - 1), 1000);
    return () => clearTimeout(id);
  }, [timer]);

  // فوکوس روی خانه اول
  useEffect(() => {
    inputsRef.current[0]?.focus();
  }, []);

  const onChangeCell = (val: string, idx: number) => {
    if (!/^[0-9]?$/.test(val)) return; // فقط یک رقم یا خالی
    const next = [...cells];
    next[idx] = val;
    setCells(next);
    if (val && idx < 5) inputsRef.current[idx + 1]?.focus();
  };

  const onPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const next = pasted.split('');
    while (next.length < 6) next.push('');
    setCells(next);
    const lastIndex = Math.min(pasted.length, 6) - 1;
    inputsRef.current[lastIndex]?.focus();
    e.preventDefault();
  };

  const onVerify = async () => {
    const code = cells.join('');
    if (code.length !== 6) {
      alert('کد ۶ رقمی را کامل وارد کنید');
      return;
    }
    setLoading(true);
    try {
      const token = await verifyOtp(phone, code);
      localStorage.setItem('access_token', token);
      router.push('/jobs');
    } catch (err) {
      console.error(err);
      alert('کد اشتباه یا منقضی شده است.');
    } finally {
      setLoading(false);
    }
  };

  const onResend = async () => {
    try {
      await requestOtp(phone);
      setTimer(60);
    } catch (err) {
      console.error(err);
      alert('ارسال مجدد ناموفق بود');
    }
  };

  return (
    <main className="min-h-screen w-full flex items-center justify-center bg-[#F1F1F1] px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl p-6 text-center shadow">
        <h2 className="text-[#7D6CB2] font-extrabold text-lg">
          کد ارسال‌شده به {phone} را وارد کنید
        </h2>

        <div className="mt-5 flex justify-center gap-2" dir="ltr">
          {cells.map((v, i) => (
            <input
              key={i}
              // 🔧 فیکس اصلی: کال‌بک ref چیزی برنمی‌گرداند (return ندارد)
              ref={(el) => {
                inputsRef.current[i] = el;
              }}
              value={v}
              onChange={(e) => onChangeCell(e.target.value, i)}
              onPaste={onPaste}
              className="w-10 h-12 border rounded-lg text-center text-xl outline-none focus:border-[#7D6CB2] focus:ring-2 focus:ring-[#7D6CB233]"
              maxLength={1}
              inputMode="numeric"
            />
          ))}
        </div>

        <button
          onClick={onVerify}
          disabled={loading}
          className="mt-6 w-full h-12 rounded-xl bg-[#7D6CB2] text-white font-bold active:scale-[0.98] transition"
        >
          {loading ? 'در حال تایید…' : 'تایید'}
        </button>

        <div className="mt-4 text-sm text-gray-600">
          {timer > 0 ? (
            <>ارسال مجدد کد تا {timer} ثانیه دیگر</>
          ) : (
            <button onClick={onResend} className="text-[#7D6CB2] underline">
              ارسال مجدد کد
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
