'use client';

export default function LogoutButton() {
  const handleLogout = async () => {
    try {
      // پاک‌کردن سشن از سمت سرور (کوکی access_token/refresh_token)
      await fetch('/auth/logout', { method: 'POST' });

      // اگر قبلاً توکن را در localStorage هم می‌گذاشتی، پاک شود
      try { localStorage.removeItem('token'); } catch {}

      // انتقال به صفحه لاگین
      window.location.href = '/auth/login';
    } catch {
      // در صورت خطا هم کاربر را به لاگین بفرست
      window.location.href = '/auth/login';
    }
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="h-9 px-3 rounded-xl border text-sm hover:bg-red-50 text-red-600"
      aria-label="خروج"
      title="خروج"
    >
      خروج
    </button>
  );
}

