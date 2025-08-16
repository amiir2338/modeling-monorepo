'use client';

import { useEffect, useState } from 'react';

export default function TokenSetterPage() {
  const [input, setInput] = useState('');
  const [current, setCurrent] = useState<string | null>(null);

  useEffect(() => {
    const t = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    setCurrent(t);
  }, []);

  const save = () => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('access_token', input.trim());
    setCurrent(input.trim());
    setInput('');
    alert('توکن ذخیره شد ✅');
  };

  const clear = () => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('access_token');
    setCurrent(null);
    alert('توکن حذف شد');
  };

  return (
    <main className="p-4 max-w-xl mx-auto space-y-4">
      <h1 className="text-xl font-bold">ست کردن توکن (Dev)</h1>

      <div className="space-y-2">
        <label className="block text-sm opacity-80">توکن را وارد کن (فقط خودِ توکن؛ نه «Bearer »)</label>
        <input
          className="w-full border rounded-lg p-2"
          placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <div className="flex gap-2">
          <button onClick={save} className="px-4 py-2 rounded-lg bg-black text-white">ذخیره توکن</button>
          <button onClick={clear} className="px-4 py-2 rounded-lg border">حذف توکن</button>
        </div>
      </div>

      <div className="text-sm">
        <div className="font-medium">توکن فعلی:</div>
        <code className="block mt-1 p-2 bg-black/5 rounded">{current ?? '—'}</code>
      </div>
    </main>
  );
}
