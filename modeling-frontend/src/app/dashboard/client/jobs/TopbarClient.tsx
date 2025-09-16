'use client';

/**
 * 🟢 ساده بگم: این نوار بالا (Topbar) توی داشبورد کلاینته.
 *   - ورودی جست‌وجو
 *   - فیلتر وضعیت
 *   - دکمه پروفایل
 *   - دکمه خروج
 *
 * 🟢 نکته مهم: API ما زیر /api/v1/... است و کوکی HttpOnly داریم.
 *   پس برای logout باید به /api/v1/auth/logout POST بزنیم
 *   و withCredentials روشن باشه تا کوکی همراه درخواست بره.
 */

import { useRouter } from 'next/navigation';
import http from '@/lib/api/http'; // 🟢 این همون axios instance یکپارچهٔ پروژه‌ست
import React from 'react';

interface TopbarClientProps {
  query: string;
  setQuery: (query: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
}

export default function TopbarClient({
  query,
  setQuery,
  statusFilter,
  setStatusFilter,
}: TopbarClientProps) {
  const router = useRouter();

  async function handleLogout() {
    try {
      // 🟢 1) خروج: کوکی HttpOnly در سرور پاک می‌شود
      await http.post('/api/v1/auth/logout', {}, { withCredentials: true });

      // 🟢 2) هدایت به صفحهٔ ورود
      router.replace('/auth/login');
    } catch (err) {
      // 🟢 اگر مشکلی بود به کاربر پیام بده
      console.error('[Logout] خطا در خروج', err);
      alert('خروج ناموفق بود. دوباره تلاش کنید.');
    }
  }

  return (
    <div className="h-14 flex items-center justify-between px-3 md:px-4 border-b">
      <div className="text-sm text-gray-600 flex items-center gap-2">
        {/* 🟢 برچسب تست را حذف کردیم تا UI تمیز باشد */}
        خوش آمدید ✨
      </div>

      <div className="flex items-center gap-2">
        {/* 🟢 ورودی جستجو (لوکال استیت از والد می‌آید) */}
        <input
          className="h-9 w-44 md:w-64 rounded-xl border px-3 text-sm outline-none focus:ring-2 focus:ring-gray-200"
          placeholder="جستجو در عنوان آگهی‌ها..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        {/* 🟢 فیلتر وضعیت آگهی‌ها */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 w-32 rounded-xl border px-3 text-sm outline-none focus:ring-2 focus:ring-gray-200"
        >
          <option value="all">همه وضعیت‌ها</option>
          <option value="approved">تایید شده</option>
          <option value="pending">در انتظار</option>
          <option value="rejected">رد شده</option>
        </select>

        {/* 🟢 دکمه پروفایل (فعلاً placeholder) */}
        <button className="h-9 px-3 rounded-xl border hover:bg-gray-50 text-sm">
          پروفایل
        </button>

        {/* 🟢 دکمه خروج */}
        <button
          onClick={handleLogout}
          className="h-9 px-3 rounded-xl border bg-red-50 hover:bg-red-100 text-sm text-red-700"
        >
          خروج
        </button>
      </div>
    </div>
  );
}
