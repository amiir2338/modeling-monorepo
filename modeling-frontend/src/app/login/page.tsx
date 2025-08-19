'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { loginUser } from '../lib/auth-client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (!email.trim() || !password) {
      setMsg('ایمیل و گذرواژه را کامل وارد کنید.');
      return;
    }
    setBusy(true);
    try {
      const res = await loginUser(email.trim(), password);
      if (res?.token) {
        localStorage.setItem('token', res.token);
        setMsg('ورود موفق. در حال انتقال…');
        setTimeout(() => router.push('/jobs'), 600);
      } else {
        setMsg(res?.message || 'ورود ناموفق بود.');
      }
    } catch (err: any) {
      setMsg(err?.message || 'ورود ناموفق بود.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main dir="rtl" className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200/70 dark:border-slate-700/50 p-6">
        <h1 className="text-xl font-extrabold mb-4 text-center">ورود</h1>
        <form onSubmit={onSubmit} className="space-y-3">
          <input
            type="email"
            placeholder="ایمیل"
            className="w-full rounded-xl border border-slate-300/70 px-3 py-2 outline-none focus:ring-2 focus:ring-violet-400"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            placeholder="گذرواژه"
            className="w-full rounded-xl border border-slate-300/70 px-3 py-2 outline-none focus:ring-2 focus:ring-violet-400"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl px-4 py-2 font-bold text-white bg-black hover:opacity-90 disabled:opacity-60"
          >
            {busy ? '...' : 'ورود'}
          </button>
        </form>
        {msg && (
          <div className="mt-4 text-sm text-center"
               style={{color: msg.includes('موفق') ? '#047857' : '#b91c1c'}}>
            {msg}
          </div>
        )}
        <div className="mt-4 text-center text-sm">
          حساب ندارید؟ <a href="/register" className="underline">ثبت‌نام</a>
        </div>
      </div>
    </main>
  );
}
