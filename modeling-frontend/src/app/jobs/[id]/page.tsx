'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import type { AxiosError } from 'axios';
import { axiosInstance } from '../../api/axios-instance';

/**
 * ELI5:
 * این صفحه جزئیات یک آگهی را از /v1/jobs/:id می‌گیرد.
 * - اگر id نبود (مثلاً فایل اشتباهی در /jobs/page.tsx قرار گرفته)،
 *   به /jobs برمی‌گردانیم تا روی "در حال بارگذاری" گیر نکند.
 * - وضعیت‌های pending و pending_review هر دو به "در انتظار بررسی" نگاشت می‌شوند.
 * - اگر کاربر ادمین یا صاحب آگهی باشد، دکمه‌های مدیریت (ویرایش، حذف، تایید/رد) را می‌بیند.
 */

type JobStatusRaw = 'pending' | 'pending_review' | 'approved' | 'rejected';
type Job = {
  _id: string;
  title: string;
  description?: string | null;
  budget?: number | null;
  city?: string | null;
  clientId?: unknown;
  status?: JobStatusRaw;
  rejectedReason?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type Me = {
  id: string;
  role: 'client' | 'admin' | 'user' | string;
  clientId?: string | null;
};

function decodeJwt(token: string | null): Record<string, unknown> | null {
  if (!token) return null;
  try {
    const [, payload] = token.split('.');
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore - برای مرورگرهای قدیمی
    return JSON.parse(decodeURIComponent(escape(json))) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function extractMeFromToken(token: string | null): Me | null {
  const p = decodeJwt(token); if (!p) return null;
  const pid = p as Record<string, unknown>;

  const id =
    (pid.id as string) ?? (pid.userId as string) ?? (pid.user_id as string) ??
    (pid.sub as string) ?? (pid.uid as string) ??
    ((pid.user as Record<string, unknown>)?._id as string) ??
    ((pid.user as Record<string, unknown>)?.id as string) ?? null;

  const clientId =
    (pid.clientId as string) ??
    ((pid.user as { clientId?: unknown })?.clientId as string) ?? null;

  let role: string | undefined;
  if (typeof pid.role === 'string') role = pid.role as string;
  else if (Array.isArray(pid.roles) && (pid.roles as unknown[]).length) role = String((pid.roles as unknown[])[0]);
  else if (typeof (pid as { isAdmin?: boolean }).isAdmin === 'boolean') role = (pid as { isAdmin?: boolean }).isAdmin ? 'admin' : 'user';
  else if (typeof (pid.user as { role?: unknown })?.role === 'string') role = String((pid.user as { role?: unknown }).role);

  if (!id) return null;
  return { id: String(id), role: (role ?? 'user') as Me['role'], clientId: clientId ?? null };
}

function normalizeId(val: unknown): string | null {
  if (!val) return null;
  if (typeof val === 'string') return val;
  if (typeof val === 'object') {
    const obj = val as Record<string, unknown>;
    const a = obj._id ?? obj.id ?? null;
    return a ? String(a) : null;
  }
  return null;
}

// نگاشت وضعیت سرور به لیبل و کلاس ظاهری
function renderStatus(status?: JobStatusRaw, title?: string | null) {
  if (!status) return null;
  const normalized = status === 'pending_review' ? 'pending' : status;
  const label =
    normalized === 'approved' ? 'تایید شده' :
    normalized === 'pending'  ? 'در انتظار بررسی' :
    'رد شده';

  const cls =
    normalized === 'approved'
      ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
      : normalized === 'pending'
      ? 'bg-amber-100 text-amber-800 border-amber-200'
      : 'bg-rose-100 text-rose-800 border-rose-200';

  return (
    <span
      title={title ?? undefined}
      className={`px-3 py-1 rounded-full text-xs inline-flex items-center gap-1 border ${cls}`}
    >
      <span className="inline-block w-2 h-2 rounded-full bg-current/60" />
      {label}
    </span>
  );
}

export default function JobDetailsPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const jobId = params?.id;

  const token = useMemo(
    () => (typeof window !== 'undefined' ? localStorage.getItem('access_token') : null),
    []
  );
  const me = useMemo(() => extractMeFromToken(token), [token]);

  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [moderating, setModerating] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  // اگر این فایل اشتباهی در /jobs/page.tsx قرار گرفته باشد و id نداریم، برگرد به /jobs
  useEffect(() => {
    if (!jobId) {
      // از گیرکردن روی لودینگ جلوگیری می‌کند
      router.replace('/jobs');
    }
  }, [jobId, router]);

  useEffect(() => {
    if (!jobId) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const res = await axiosInstance.get<{ ok?: boolean; data?: Job; job?: Job }>(`/v1/jobs/${jobId}`);
        if (cancelled) return;
        // بک‌اند ممکن است {data:{...}} یا {job:{...}} یا {...} بدهد
        const j = (res.data?.data ?? res.data?.job ?? res.data) as Job;
        setJob(j);
      } catch (e: unknown) {
        const ax = e as AxiosError<{ message?: string }>;
        if (cancelled) return;
        setErr(ax.response?.data?.message ?? ax.message ?? 'دریافت جزئیات ناموفق بود');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [jobId]);

  const canManage = useMemo(() => {
    if (!me || !job) return false;
    if (me.role === 'admin') return true;
    if (me.role === 'client') {
      const jobClient = normalizeId(job.clientId);
      const myClient = me.clientId ? String(me.clientId) : null;
      return !!jobClient && !!myClient && jobClient === myClient;
    }
    return false;
  }, [me, job]);

  const isAdmin = me?.role === 'admin';

  async function onDelete() {
    if (!job) return;
    if (!confirm('آیا از حذف این فرصت مطمئن هستی؟')) return;
    setDeleting(true);
    setErr(null);
    try {
      await axiosInstance.delete(`/v1/jobs/${job._id}`);
      alert('فرصت با موفقیت حذف شد ✅');
      router.push('/jobs');
    } catch (e: unknown) {
      const ax = e as AxiosError<{ message?: string }>;
      setErr(ax.response?.data?.message ?? ax.message ?? 'حذف ناموفق بود');
    } finally {
      setDeleting(false);
    }
  }

  async function onApprove() {
    if (!job) return;
    setModerating(true);
    setErr(null);
    try {
      await axiosInstance.patch(`/v1/jobs/${job._id}/approve`);
      alert('آگهی تایید شد ✅');
      // گرفتن دوباره جزئیات برای بروزرسانی وضعیت
      router.refresh?.();
      setJob((prev) => (prev ? { ...prev, status: 'approved' } : prev));
    } catch (e: unknown) {
      const ax = e as AxiosError<{ message?: string }>;
      setErr(ax.response?.data?.message ?? ax.message ?? 'تایید ناموفق بود');
    } finally {
      setModerating(false);
    }
  }

  async function onReject() {
    if (!job) return;
    if (!rejectReason.trim()) {
      alert('لطفاً دلیل رد را وارد کنید.');
      return;
    }
    setModerating(true);
    setErr(null);
    try {
      await axiosInstance.patch(`/v1/jobs/${job._id}/reject`, { reason: rejectReason.trim() });
      alert('آگهی رد شد ❌');
      router.refresh?.();
      setJob((prev) => (prev ? { ...prev, status: 'rejected', rejectedReason: rejectReason.trim() } : prev));
    } catch (e: unknown) {
      const ax = e as AxiosError<{ message?: string }>;
      setErr(ax.response?.data?.message ?? ax.message ?? 'رد آگهی ناموفق بود');
    } finally {
      setModerating(false);
    }
  }

  return (
    <main className="p-4 max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Link href="/jobs" className="px-3 py-1 rounded border">← بازگشت</Link>

        {canManage && (
          <div className="flex items-center gap-2">
            <Link href={`/jobs/${job?._id}/edit`} className="px-3 py-1 rounded border">
              ویرایش
            </Link>
            <button
              onClick={onDelete}
              disabled={deleting}
              className="px-3 py-1 rounded bg-red-600 text-white disabled:opacity-50"
            >
              {deleting ? 'در حال حذف…' : 'حذف'}
            </button>
          </div>
        )}
      </div>

      {loading && <div>در حال بارگذاری…</div>}
      {err && !loading && <div className="text-red-600">{err}</div>}

      {!loading && !err && job && (
        <article className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-2xl font-bold">{job.title}</h1>
            {renderStatus(job.status, job.rejectedReason ?? null)}
          </div>

          <div className="text-sm opacity-70">
            {job.createdAt && <>ثبت: {new Date(job.createdAt).toLocaleString('fa-IR')}</>}
            {job.updatedAt && <> · بروزرسانی: {new Date(job.updatedAt).toLocaleString('fa-IR')}</>}
          </div>

          {typeof job.budget === 'number' && (
            <div className="text-sm">بودجه: {job.budget.toLocaleString('fa-IR')}</div>
          )}
          {job.city && <div className="text-sm">شهر: {job.city}</div>}
          {job.description && (
            <p className="leading-7 whitespace-pre-wrap">{job.description}</p>
          )}

          {/* پنل ادمین برای moderation */}
          {isAdmin && job.status !== 'approved' && (
            <div className="mt-4 border rounded-lg p-3 space-y-2">
              <div className="font-medium">مدیریت تایید</div>
              <div className="flex items-center gap-2">
                <button
                  onClick={onApprove}
                  disabled={moderating}
                  className="px-3 py-1 rounded bg-green-600 text-white disabled:opacity-50"
                >
                  {moderating ? '...' : 'تایید'}
                </button>

                <input
                  className="flex-1 border rounded p-2 text-sm"
                  placeholder="دلیل رد (اختیاری اما پیشنهاد می‌شود)"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                />
                <button
                  onClick={onReject}
                  disabled={moderating}
                  className="px-3 py-1 rounded bg-red-600 text-white disabled:opacity-50"
                >
                  {moderating ? '...' : 'رد'}
                </button>
              </div>
              {job.rejectedReason && (
                <div className="text-xs text-red-700">آخرین دلیل رد: {job.rejectedReason}</div>
              )}
            </div>
          )}
        </article>
      )}
    </main>
  );
}
