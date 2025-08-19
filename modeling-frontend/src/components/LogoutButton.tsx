'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

export default function LogoutButton() {
  const router = useRouter();
  function onLogout() {
    try {
      localStorage.removeItem('token');
    } catch {}
    router.push('/login');
  }
  return (
    <button
      type="button"
      onClick={onLogout}
      className="px-3 py-2 rounded-xl border border-slate-300/70 hover:bg-slate-50 dark:hover:bg-slate-700 text-sm"
      title="خروج"
    >
      خروج
    </button>
  );
}
