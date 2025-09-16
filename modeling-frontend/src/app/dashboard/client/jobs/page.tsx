'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import http from '@/lib/api/http';
import type { JobDTO, ApiOkPaginated } from '@/lib/types';

export default function ClientJobsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<JobDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    // Client-side guard: if there is no auth cookie/local token, redirect to login.
    // This complements server middleware and ensures Playwright receives the expected redirect.
    if (typeof document !== 'undefined') {
      const cookie = document.cookie || '';
      const hasAuthCookie = /(?:\bauth=|\btoken=|\baccess_token=)/.test(cookie);
      const hasLocal = !!localStorage.getItem('auth') || !!localStorage.getItem('token');
      if (!hasAuthCookie && !hasLocal) {
        // If the cookie is HttpOnly (not visible to document.cookie) the above check
        // returns false even when the browser has the auth cookie. Probe the server
        // with a lightweight /auth/me call (with credentials) to verify session.
        (async () => {
          try {
            await http.get('/api/v1/auth/me', { withCredentials: true });
            // authenticated — let the effect continue and fetch jobs
          } catch (e) {
            try {
              router.replace(`/auth/login?next=/dashboard/client/jobs`);
            } catch (er) {
              // ignore
            }
          }
        })();
      }
    }
    let mounted = true;

    const fetchJobs = async () => {
      setLoading(true);
      setError(null);
      try {
        // 🟢 مسیر درست: /api/v1/jobs/my
        const res = await http.get<ApiOkPaginated<JobDTO>>('/api/v1/jobs/my', {
          params: { page: 1, limit: 20, status: statusFilter, q: query },
          withCredentials: true, // 🟢 برای ارسال کوکی HttpOnly
        });

        if (mounted) {
          if (res.data && res.data.ok) {
            // Defensive: backend may return either { ok, data } or { ok, jobs }
            const maybeData = (res.data as any).data ?? (res.data as any).jobs ?? [];
            const values = Array.isArray(maybeData) ? maybeData : [];
            setRows(values as JobDTO[]);
          } else {
            setError('خطا در بارگذاری آگهی‌ها');
          }
        }
      } catch (err) {
        if (mounted) {
          const msg =
            err instanceof Error
              ? err.message
              : 'مشکلی در ارتباط با سرور پیش آمده است.';
          setError(msg);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();
    return () => {
      mounted = false;
    };
  }, [statusFilter, query]);

  return (
    <main className="p-4">
      <h1 className="font-bold text-lg mb-3">Client • My Jobs</h1>

      {error && <div className="text-red-500">{error}</div>}

      <div className="mb-3">
        <input
          type="text"
          placeholder="جستجو در عنوان آگهی‌ها"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="border p-2 rounded w-full mb-2"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border p-2 rounded w-full"
        >
          <option value="all">همه وضعیت‌ها</option>
          <option value="approved">تایید شده</option>
          <option value="pending">در انتظار</option>
          <option value="rejected">رد شده</option>
        </select>
      </div>

      {loading ? (
        <div>Loading...</div>
      ) : (
        <ul className="space-y-2">
          {rows.length === 0 ? (
            <li>آگهی‌ای پیدا نشد</li>
          ) : (
            rows.map((j) => (
              <li key={j._id} className="border rounded p-3">
                <div className="font-semibold">{j.title}</div>
                <div className="text-sm text-gray-600">{j.status}</div>
              </li>
            ))
          )}
        </ul>
      )}
    </main>
  );
}
