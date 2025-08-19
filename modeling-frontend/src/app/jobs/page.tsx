'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { AxiosError } from 'axios';
import { axiosInstance } from '../api/axios-instance';

// --------- Types (بدون any) -----------
type JobStatus = 'draft' | 'pending_review' | 'approved' | 'rejected';

export type Job = {
  _id: string;
  clientId: string;
  title: string;
  description?: string | null;
  budget?: number | null;
  city?: string | null;
  date?: string | null;
  status: JobStatus;
  draftExpiresAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type JobsResponse = {
  jobs: Job[];
  page: number;
  limit: number;
  total: number;
};

// ---------- Metadata / Viewport ----------
export const viewport = {
  themeColor: '#7D6CB2',
};

// (نکته: themeColor را اینجا گذاشتیم تا هشدار Next رفع شود)
export const metadata = {
  title: 'فرصت‌های همکاری',
  description: 'لیست فرصت‌های مدلینگ',
};

// ---------- Helpers (بدون any) ----------
const sanitizeInt = (v: unknown, fallback: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
};

export default function JobsPage() {
  // UI state
  const [onlyMine, setOnlyMine] = useState<boolean>(true);
  const [q, setQ] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<JobStatus | 'all'>('all');
  const [order, setOrder] = useState<'newest' | 'oldest'>('newest');
  const [page, setPage] = useState<number>(1);

  // Data state
  const [jobs, setJobs] = useState<Job[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [limit, setLimit] = useState<number>(10);
  const [loading, setLoading] = useState<boolean>(false);
  const [err, setErr] = useState<string | null>(null);

  // توکن (برای تصمیم‌گیری: اگر فقط عمومی بخواهیم، بدون توکن هم کار می‌کند)
  const token = useMemo(
    () => (typeof window !== 'undefined' ? localStorage.getItem('access_token') : null),
    []
  );

  // ساخت آدرس API بر اساس فیلترها
  const apiUrl = useMemo(() => {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', String(limit));
    if (q.trim()) params.set('q', q.trim());
    if (statusFilter !== 'all') params.set('status', statusFilter);
    // ترتیب
    params.set('sort', order === 'newest' ? '-createdAt' : 'createdAt');
    // مسیر:
    return `/v1/jobs${onlyMine ? '/my' : ''}?${params.toString()}`;
  }, [page, limit, q, statusFilter, order, onlyMine]);

  // Fetcher
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setErr(null);
      try {
        const res = await axiosInstance.get<JobsResponse>(apiUrl);
        // اگر بک‌اند خطا برگرداند (validateStatus اجازه نمی‌دهد وارد then شویم) → به catch می‌افتد
        // پس اینجا یا 2xx یا 3xx هستیم.
        const data = res.data;
        if (!cancelled) {
          setJobs(Array.isArray(data.jobs) ? data.jobs : []);
          setPage(sanitizeInt(data.page, 1));
          setLimit(sanitizeInt(data.limit, 10));
          setTotal(sanitizeInt(data.total, 0));
        }
      } catch (e) {
        const ax = e as AxiosError<{ message?: string }>;
        if (!cancelled) {
          setErr(
            ax.response?.data?.message ||
              ax.message ||
              'خطا در دریافت لیست فرصت‌ها'
          );
          setJobs([]); // ELI5: حتی در خطا هم «loading» را متوقف و داده را خالی می‌کنیم تا گیر نکند
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    // اگر onlyMine=true ولی توکن نداریم، بجایش عمومی را بخوان
    if (onlyMine && !token) {
      setOnlyMine(false);
      return;
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [apiUrl, onlyMine, token]);

  return (
    <main className="p-4 max-w-5xl mx-auto space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-lg font-bold">فرصت‌های همکاری</h1>
        <span className="text-sm text-slate-500">کل: {total}</span>
        <Link
          href="/jobs/create"
          className="px-3 py-2 rounded-xl bg-[#7D6CB2] text-white hover:opacity-90"
        >
          + ایجاد فرصت
        </Link>
      </header>

      {/* فیلترها */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={onlyMine}
            onChange={(e) => setOnlyMine(e.target.checked)}
          />
          فقط آگهی‌های من
        </label>

        <input
          className="border rounded-lg px-3 py-2"
          placeholder="جستجو در عنوان..."
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
        />

        <select
          className="border rounded-lg px-3 py-2"
          value={statusFilter}
          onChange={(e) => {
            const v = e.target.value as JobStatus | 'all';
            setStatusFilter(v);
            setPage(1);
          }}
        >
          <option value="all">همه وضعیت‌ها</option>
          <option value="draft">پیش‌نویس</option>
          <option value="pending_review">در انتظار بررسی</option>
          <option value="approved">تایید شده</option>
          <option value="rejected">رد شده</option>
        </select>

        <select
          className="border rounded-lg px-3 py-2"
          value={order}
          onChange={(e) => {
            const v = e.target.value as 'newest' | 'oldest';
            setOrder(v);
            setPage(1);
          }}
        >
          <option value="newest">جدیدترین</option>
          <option value="oldest">قدیمی‌ترین</option>
        </select>
      </section>

      {/* نمایش وضعیت بارگذاری/خطا */}
      {loading && (
        <div className="border rounded-lg p-3 text-center">...در حال بارگذاری</div>
      )}
      {err && !loading && (
        <div className="border rounded-lg p-3 text-center text-red-600">{err}</div>
      )}

      {/* لیست کارت‌ها */}
      {!loading && !err && (
        <ul className="grid gap-3">
          {jobs.map((j) => (
            <li key={j._id} className="rounded-2xl border p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="font-bold">{j.title}</h3>
                <span className="text-xs px-2 py-1 rounded-full border">
                  وضعیت: {j.status}
                </span>
              </div>

              <div className="text-sm opacity-80 mt-1">
                {j.city ? `شهر: ${j.city} ` : ''}{j.budget ? ` | بودجه: ${j.budget}` : ''}
              </div>

              <div className="flex gap-2 mt-3">
                <Link
                  href={`/jobs/${j._id}`}
                  className="px-3 py-2 rounded-lg border hover:bg-black/5"
                >
                  جزئیات
                </Link>
                {j.status !== 'approved' && (
                  <Link
                    href={`/jobs/${j._id}/edit`}
                    className="px-3 py-2 rounded-lg border hover:bg-black/5"
                  >
                    ویرایش
                  </Link>
                )}
              </div>
            </li>
          ))}

          {jobs.length === 0 && (
            <li className="text-center opacity-70 py-8">
              موردی یافت نشد.
            </li>
          )}
        </ul>
      )}
    </main>
  );
}
