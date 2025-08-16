'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { AxiosError } from 'axios';
import { axiosInstance } from '../api/axios-instance';

type JobStatus = 'draft' | 'pending_review' | 'approved' | 'rejected';
type Job = {
  _id: string;
  title: string;
  description?: string | null;
  budget?: number | null;
  city?: string | null;
  clientId?: string;
  status?: JobStatus;
  createdAt?: string;
  draftExpiresAt?: string | null;
};

type ListResponse = {
  total?: number;
  page?: number;
  limit?: number;
  data?: Job[];
  jobs?: Job[]; // پاسخ /my
};

type SortBy = 'newest' | 'oldest' | 'budget_desc' | 'budget_asc';

function useQueryParamInt(key: string, fallback = 1) {
  const [value, setValue] = useState<number>(fallback);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const sp = new URLSearchParams(window.location.search);
    const raw = sp.get(key);
    const n = raw ? Number(raw) : fallback;
    setValue(Number.isFinite(n) && n > 0 ? n : fallback);
  }, [key, fallback]);
  return value;
}

function decodeJwt(token: string | null): Record<string, unknown> | null {
  if (!token) return null;
  try {
    const [, payload] = token.split('.');
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decodeURIComponent(escape(json)));
  } catch {
    return null;
  }
}

function Badge({
  children,
  color = 'slate',
}: {
  children: React.ReactNode;
  color?: 'green' | 'amber' | 'red' | 'slate' | 'blue';
}) {
  const map: Record<string, string> = {
    green: 'bg-green-100 text-green-700 border-green-200',
    amber: 'bg-amber-100 text-amber-700 border-amber-200',
    red: 'bg-red-100 text-red-700 border-red-200',
    slate: 'bg-slate-100 text-slate-700 border-slate-200',
    blue: 'bg-blue-100 text-blue-700 border-blue-200',
  };
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${map[color]}`}
    >
      {children}
    </span>
  );
}

function statusColor(s?: JobStatus): 'green' | 'amber' | 'red' | 'slate' | 'blue' {
  switch (s) {
    case 'approved':
      return 'green';
    case 'pending_review':
      return 'amber';
    case 'rejected':
      return 'red';
    case 'draft':
      return 'blue';
    default:
      return 'slate';
  }
}

export default function JobsPage() {
  const page = useQueryParamInt('page', 1);
  const limit = 10;

  // auth
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
  const me = token ? decodeJwt(token) : null;
  const isLoggedIn = !!me;

  // کنترل‌ها
  const [showMine, setShowMine] = useState<boolean>(isLoggedIn); // اگر لاگین هست، پیش‌فرض «آگهی‌های من»
  const [q, setQ] = useState<string>(''); // سرچ عنوان
  const [statusFilter, setStatusFilter] = useState<'all' | JobStatus>('all'); // فقط روی «من»
  const [sortBy, setSortBy] = useState<SortBy>('newest');

  // داده‌ها
  const [items, setItems] = useState<Job[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [err, setErr] = useState<string | null>(null);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total, limit]);

  // fetch
  const fetchList = async () => {
    setLoading(true);
    setErr(null);
    try {
      const endpoint = showMine && isLoggedIn ? '/api/v1/jobs/my' : '/api/v1/jobs';
      const res = await axiosInstance.get<ListResponse>(endpoint, {
        params: { page, limit },
        headers: showMine && token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = (res.data.jobs ?? res.data.data ?? []) as Job[];
      setItems(Array.isArray(data) ? data : []);
      setTotal(res.data.total ?? data.length);
    } catch (e: unknown) {
      const ax = e as AxiosError<{ message?: string }>;
      setErr(ax.response?.data?.message ?? ax.message ?? 'خطا در دریافت لیست');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, showMine, isLoggedIn]);

  // فیلتر و مرتب‌سازی (سمت کلاینت)
  const view = useMemo(() => {
    let data = [...items];

    // فیلتر وضعیت (فقط وقتی «آگهی‌های من» فعال است)
    if (showMine && statusFilter !== 'all') {
      data = data.filter((j) => j.status === statusFilter);
    }

    // سرچ عنوان
    const needle = q.trim().toLowerCase();
    if (needle) {
      data = data.filter((j) => (j.title || '').toLowerCase().includes(needle));
    }

    // مرتب‌سازی
    data.sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime();
      } else if (sortBy === 'oldest') {
        return new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime();
      } else if (sortBy === 'budget_desc') {
        return (b.budget ?? Number.NEGATIVE_INFINITY) - (a.budget ?? Number.NEGATIVE_INFINITY);
      }
      // budget_asc
      return (a.budget ?? Number.POSITIVE_INFINITY) - (b.budget ?? Number.POSITIVE_INFINITY);
    });

    return data;
  }, [items, q, statusFilter, sortBy, showMine]);

  // ناوبری صفحه
  const navigate = (p: number) => {
    if (typeof window === 'undefined') return;
    const sp = new URLSearchParams(window.location.search);
    sp.set('page', String(p));
    const url = `${window.location.pathname}?${sp.toString()}`;
    window.history.pushState({}, '', url);
    window.dispatchEvent(new Event('popstate'));
  };

  // Skeleton
  const SkeletonCard = () => (
    <div className="border rounded-xl p-3 animate-pulse">
      <div className="h-4 w-48 bg-slate-200 rounded mb-2" />
      <div className="h-3 w-32 bg-slate-200 rounded mb-1.5" />
      <div className="h-3 w-64 bg-slate-200 rounded mb-1.5" />
      <div className="h-3 w-40 bg-slate-200 rounded" />
    </div>
  );

  return (
    <main className="p-4 max-w-4xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-xl font-bold">فرصت‌های همکاری</h1>
        <div className="flex items-center gap-2">
          <Link href="/jobs/create" className="px-3 py-2 rounded-lg bg-black text-white">
            + ایجاد فرصت
          </Link>
        </div>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
        {/* سوییچ mine/public */}
        <div className="flex items-center gap-2 border rounded-lg px-3 py-2">
          <input
            id="mineSwitch"
            type="checkbox"
            className="size-4"
            checked={showMine && isLoggedIn}
            onChange={() => setShowMine((s) => !s)}
            disabled={!isLoggedIn}
          />
          <label htmlFor="mineSwitch" className={`text-sm ${!isLoggedIn ? 'opacity-50' : ''}`}>
            فقط آگهی‌های من
          </label>
        </div>

        {/* سرچ */}
        <input
          className="border rounded-lg px-3 py-2 md:col-span-2"
          placeholder="جستجو در عنوان…"
          value={q}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQ(e.target.value)}
        />

        {/* مرتب‌سازی */}
        <select
          className="border rounded-lg px-3 py-2"
          value={sortBy}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
            setSortBy(e.target.value as SortBy)
          }
        >
          <option value="newest">جدیدترین</option>
          <option value="oldest">قدیمی‌ترین</option>
          <option value="budget_desc">بودجه (زیاد → کم)</option>
          <option value="budget_asc">بودجه (کم → زیاد)</option>
        </select>

        {/* فیلتر وضعیت (فقط وقتی mine) */}
        {showMine && (
          <select
            className="border rounded-lg px-3 py-2 md:col-span-1"
            value={statusFilter}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              setStatusFilter(e.target.value as 'all' | JobStatus)
            }
          >
            <option value="all">همه وضعیت‌ها</option>
            <option value="draft">پیش‌نویس</option>
            <option value="pending_review">در حال بررسی</option>
            <option value="approved">تأیید شده</option>
            <option value="rejected">رد شده</option>
          </select>
        )}
      </div>

      {/* States */}
      {loading && (
        <div className="space-y-2">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {err && (
        <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-red-700 flex items-center justify-between">
          <div className="text-sm">{err}</div>
          <button onClick={() => void fetchList()} className="px-3 py-1 rounded bg-red-600 text-white text-sm">
            تلاش مجدد
          </button>
        </div>
      )}

      {!loading && !err && view.length === 0 && (
        <div className="p-4 rounded-lg border text-slate-600">
          {showMine
            ? 'هیچ آگهی‌ای مطابق فیلترها پیدا نشد. فیلتر را تغییر دهید یا آگهی جدید بسازید.'
            : 'در حال حاضر آگهی عمومی تایید شده‌ای وجود ندارد.'}
        </div>
      )}

      {/* List */}
      <ul className="space-y-3">
        {view.map((job: Job) => (
          <li key={job._id} className="border rounded-xl p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <Link href={`/jobs/${job._id}`} className="font-semibold hover:underline">
                  {job.title}
                </Link>

                <div className="flex flex-wrap items-center gap-2">
                  {typeof job.budget === 'number' && (
                    <Badge color="slate">بودجه: {job.budget.toLocaleString('fa-IR')}</Badge>
                  )}
                  {job.city && <Badge color="slate">شهر: {job.city}</Badge>}
                  {showMine && job.status && <Badge color={statusColor(job.status)}>وضعیت: {job.status}</Badge>}
                </div>

                {job.description && <p className="text-sm text-slate-700 line-clamp-2">{job.description}</p>}
              </div>

              <Link href={`/jobs/${job._id}`} className="shrink-0 px-3 py-1 rounded border">
                جزئیات
              </Link>
            </div>

            {job.createdAt && (
              <div className="text-xs opacity-60 mt-2">
                ثبت: {new Date(job.createdAt).toLocaleString('fa-IR')}
              </div>
            )}
          </li>
        ))}
      </ul>

      {/* Pagination */}
      {!loading && !err && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            className="px-3 py-1 rounded border disabled:opacity-50"
            onClick={() => navigate(Math.max(1, page - 1))}
            disabled={page <= 1}
          >
            قبلی
          </button>
          <span className="text-sm">
            صفحه {page} از {totalPages}
          </span>
          <button
            className="px-3 py-1 rounded border disabled:opacity-50"
            onClick={() => navigate(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
          >
            بعدی
          </button>
        </div>
      )}
    </main>
  );
}
