'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { AxiosError } from 'axios';
import { axiosInstance } from '../api/axios-instance';

/* ---------------- Types ---------------- */
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
  rejectedReason?: string | null;
  createdAt?: string;
};

type JobsListResponse =
  | { ok?: boolean; message?: string; data?: Job[]; total?: number; page?: number; limit?: number }
  | { ok?: boolean; message?: string; jobs?: Job[]; total?: number; page?: number; limit?: number };

/* ------------- Small helpers ------------ */
function useDebounced<T>(value: T, delay = 400) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

function toInt(v: string | null, d: number) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : d;
}

/* ------------- Page Component ------------ */
export default function JobsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const spStr = sp.toString();

  // URL → state
  const [q, setQ] = useState(() => sp.get('q') ?? '');
  const [status, setStatus] = useState<JobStatus | 'all'>(
    (sp.get('status') as JobStatus | 'all') || 'all'
  );
  const [page, setPage] = useState(() => toInt(sp.get('page'), 1));
  const [limit, setLimit] = useState(() => toInt(sp.get('limit'), 10));

  const debouncedQ = useDebounced(q, 400);

  // data
  const [jobs, setJobs] = useState<Job[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // sync state → URL (بدون رفرش)
  const firstSyncDone = useRef(false);
  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedQ.trim()) params.set('q', debouncedQ.trim());
    if (status !== 'all') params.set('status', status);
    if (page !== 1) params.set('page', String(page));
    if (limit !== 10) params.set('limit', String(limit));
    const qs = params.toString();
    const url = qs ? `${pathname}?${qs}` : pathname;

    const currentUrl = spStr ? `${pathname}?${spStr}` : pathname;
    if (!firstSyncDone.current && url === currentUrl) {
      firstSyncDone.current = true;
      return;
    }
    router.replace(url, { scroll: false });
  }, [debouncedQ, status, page, limit, pathname, router, spStr]);

  // fetch
  useEffect(() => {
    let ignore = false;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const params: Record<string, string | number> = { page, limit };
        if (debouncedQ.trim()) params.q = debouncedQ.trim();
        if (status !== 'all') params.status = status;

        const { data } = await axiosInstance.get<JobsListResponse>('/v1/jobs', { params });
        if (ignore) return;

        // اگر سرور ok:false بده
        if ('ok' in data && data.ok === false) {
          setErr(data.message || 'امکان دریافت آگهی‌ها نیست');
          setJobs([]);
          setTotal(0);
          return;
        }

        // استخراج آرایه آگهی‌ها (data یا jobs)
        const jobsArr: Job[] =
          ('data' in data && Array.isArray(data.data)) ? data.data as Job[] :
          ('jobs' in data && Array.isArray(data.jobs)) ? data.jobs as Job[] :
          [];

        const totalVal = typeof data.total === 'number' ? data.total : jobsArr.length;

        setJobs(jobsArr);
        setTotal(totalVal);
      } catch (e) {
        if (ignore) return;
        const ax = e as AxiosError<{ message?: string }>;
        setErr(ax.response?.data?.message || ax.message || 'خطا در دریافت آگهی‌ها');
        setJobs([]);
        setTotal(0);
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, [debouncedQ, status, page, limit]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const filtered = useMemo(() => {
    // نمایش فوری سمت کلاینت (صرفاً UX بهتر؛ فیلتر اصلی سمت سرور است)
    const term = debouncedQ.trim().toLowerCase();
    return jobs.filter((j) => {
      const byQ =
        !term ||
        j.title.toLowerCase().includes(term) ||
        (j.description ?? '').toLowerCase().includes(term) ||
        (j.city ?? '').toLowerCase().includes(term);
      const byStatus = status === 'all' || j.status === status;
      return byQ && byStatus;
    });
  }, [jobs, debouncedQ, status]);

  /* ---------------- UI ---------------- */
  return (
    <main dir="rtl" className="container-std py-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-extrabold">آگهی‌های همکاری</h1>
        <Link
          href="/jobs/create"
          className="inline-flex items-center justify-center rounded-xl px-4 py-2 font-bold bg-black text-white hover:opacity-90"
        >
          ثبت آگهی جدید
        </Link>
      </div>

      {/* فیلترها */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-6">
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setPage(1); }}
          placeholder="جستجو در عنوان/توضیح/شهر…"
          className="rounded-xl border border-slate-300/70 px-3 py-2 outline-none focus:ring-2 focus:ring-violet-400"
        />
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value as JobStatus | 'all'); setPage(1); }}
          className="rounded-xl border border-slate-300/70 px-3 py-2 outline-none focus:ring-2 focus:ring-violet-400"
        >
          <option value="all">همه وضعیت‌ها</option>
          <option value="draft">پیش‌نویس</option>
          <option value="pending_review">در انتظار بررسی</option>
          <option value="approved">تایید شده</option>
          <option value="rejected">رد شده</option>
        </select>
        <select
          value={limit}
          onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
          className="rounded-xl border border-slate-300/70 px-3 py-2 outline-none focus:ring-2 focus:ring-violet-400"
        >
          <option value={10}>10 مورد در صفحه</option>
          <option value={20}>20 مورد در صفحه</option>
          <option value={50}>50 مورد در صفحه</option>
        </select>
        <div className="self-center text-sm text-slate-500">
          {loading ? '...' : `نمایش ${filtered.length} از ${total} مورد`}
        </div>
      </div>

      {/* لیست */}
      {loading ? (
        <ListSkeleton />
      ) : err ? (
        <div className="text-red-600">{err}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center opacity-70 py-12">موردی یافت نشد.</div>
      ) : (
        <>
          <ul className="space-y-3">
            {filtered.map((job) => (
              <li key={job._id} className="job-card p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <Link href={`/jobs/${job._id}`} className="text-lg font-extrabold hover:underline">
                      {job.title}
                    </Link>
                    <div className="text-slate-600 text-sm mt-1 line-clamp-2">
                      {job.description || '—'}
                    </div>
                    <div className="mt-2 text-xs text-slate-500 flex flex-wrap gap-3">
                      {job.city && <span>🏙️ {job.city}</span>}
                      {job.date && <span>📅 {job.date}</span>}
                      {typeof job.budget === 'number' && <span>💵 بودجه: {job.budget.toLocaleString('fa-IR')}</span>}
                    </div>
                  </div>
                  <StatusBadge status={job.status} />
                </div>
                <div className="mt-3">
                  <Link href={`/jobs/${job._id}`} className="btn-outline-brand px-3 py-2 rounded-xl inline-block">
                    جزئیات
                  </Link>
                </div>
              </li>
            ))}
          </ul>

          {/* pagination */}
          <div className="flex items-center justify-center gap-2 mt-6">
            <button
              className="px-3 py-2 rounded-lg border border-slate-300/70 disabled:opacity-50"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              قبلی
            </button>
            <span className="text-sm text-slate-600">
              صفحه {page} از {totalPages}
            </span>
            <button
              className="px-3 py-2 rounded-lg border border-slate-300/70 disabled:opacity-50"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              بعدی
            </button>
          </div>
        </>
      )}
    </main>
  );
}

/* ---------- Presentational bits ---------- */
function StatusBadge({ status }: { status: JobStatus }) {
  const m: Record<JobStatus, { text: string; color: string; bg: string; border: string }> = {
    draft: { text: 'پیش‌نویس', color: '#334155', bg: '#f1f5f9', border: '#e2e8f0' },
    pending_review: { text: 'در انتظار بررسی', color: '#92400e', bg: '#fef3c7', border: '#fde68a' },
    approved: { text: 'تایید شده', color: '#065f46', bg: '#d1fae5', border: '#a7f3d0' },
    rejected: { text: 'رد شده', color: '#991b1b', bg: '#fee2e2', border: '#fecaca' },
  };
  const s = m[status];
  return (
    <span
      className="text-xs font-bold rounded-full px-3 py-1"
      style={{ color: s.color, background: s.bg, border: `1px solid ${s.border}` }}
    >
      {s.text}
    </span>
  );
}

function ListSkeleton() {
  return (
    <ul className="space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <li key={i} className="job-card p-4 animate-pulse">
          <div className="h-5 w-40 rounded bg-slate-200/80" />
          <div className="h-4 w-3/4 mt-3 rounded bg-slate-200/70" />
          <div className="h-4 w-1/2 mt-2 rounded bg-slate-200/60" />
          <div className="h-8 w-24 mt-4 rounded bg-slate-200/80" />
        </li>
      ))}
    </ul>
  );
}
