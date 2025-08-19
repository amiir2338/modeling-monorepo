'use client';

import { useRouter } from 'next/navigation';

export default function LogoutButton() {
  const router = useRouter();
  const handleLogout = () => {
    try { localStorage.removeItem('token'); } catch {}
    router.push('/login');
  };
  return (
    <button
      type="button"
      onClick={handleLogout}
      className="px-3 py-2 text-sm rounded-xl border border-slate-300/70 hover:bg-slate-50 dark:hover:bg-slate-700"
      aria-label="خروج"
      title="خروج"
    >
      خروج
    </button>
  );
}
