'use client';
import React, { useState } from 'react';

export default function ResetPasswordPage() {
  const [email, setEmail] = useState<string>('');

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await fetch('/api/reset', { method: 'POST', body: JSON.stringify({ email }) });
  }

  return (
    <main className="p-4 max-w-sm mx-auto">
      <h1 className="font-bold text-lg mb-3">بازیابی رمز</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <input
          className="border rounded px-3 py-2 w-full"
          placeholder="Email"
          value={email}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
        />
        <button className="px-4 py-2 rounded bg-[#7D6CB2] text-white">ارسال</button>
      </form>
    </main>
  );
}

