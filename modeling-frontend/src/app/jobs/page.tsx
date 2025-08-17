'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import type { AxiosError } from 'axios';
import { axiosInstance } from '../api/axios-instance';

/**
 * ELI5: این یعنی آگهی چه فیلدهایی داره؛ فقط واسه تایپ‌اسکریپت و کمک به خودمون.
 */
type Job = {
  _id: string;
  title: string;
  description?: string | null;
  budget?: number | null;
  city?: string | null;
  clientId?: unknown;
  status?: 'pending' | 'approved' | 'rejected';
  rejectedReason?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

/** اطلاعات کاربر لاگین‌شده */
type Me = {
  id: string;
  role: 'client' | 'admin' | 'user' | string;
  clientId?: string | null;
};

/** توکن JWT را باز می‌کنیم تا id/role را بفهمیم */
function decodeJwt(token: string | null): Record<string, unknown> | null {
  if (!token) return null;
  try {
    const [, payload] = token.split('.');
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return JSON.parse(decodeURIComponent(escape(json))) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** از توکن، id/role/clientId را درمی‌آوریم */
function extractMeFromToken(token: string | null): Me | null {
  const p = decodeJwt(token);
  if (!p) return null;
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
  else if (Array.isArray(pid.roles as unknown[]) && (pid.roles as unknown[]).length) role = String((pid.roles as unknown[])[0]);
  else if (typeof (pid as { isAdmin?: boolean }).isAdmin === 'boolean') role = (pid as { isAdmin?: boolean }).isAdmin ? 'admin' : 'user';
  else if (typeof (pid.user as { role?: unknown })?.role === 'string') role = String((pid.user as { role?: unknown }).role);

  if (!id) return null;
  return { id: String(id), role: (role ?? 'user') as Me['role'], clientId: clientId ?? null };
}

/** اگر clientId به‌صورت آبجکت بیاد، رشته‌اش می‌کنیم */
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

/** بج وضعیت با رنگ مناسب */
function StatusBadge({ status, title }: { status?: Job['status']; title?: string | null }) {
  if (!status) return null;
  const map = {
    approved: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    pending: 'bg-amber-100 text-amber-800 border-amber-200',
    rejected: 'bg-rose-100 text-rose-800 border-rose-200',
  } as const;
  const label = status === 'approved' ? 'تایید شده' : status === 'pending' ? 'در انتظار تایید' : 'رد شده';
  return (
    <span
      title={title ?? undefined}
      className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs ${map[status]}`}
    >
      {/* چراغ وضعیت */}
      <span className="inline-block w-2 h-2 rounded-full bg-current/60" />
      {label}
    </span>
  );
}

export default function JobDetailsPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const jobId = params?.id;

  // توکن از localStorage → که بفهمیم کی لاگینه
  const token = useMemo(
    () => (typeof window !== 'undefined' ? localStorage.getItem('access_token') : null),
    []
  );
  const me = useMemo(() => extractMeFromToken(token), [token]);

  // وضعیت‌های صفحه
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [moderating, setModerating] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  // گرفتن جزئیات آگهی
  useEffect(() => {
    if (!jobId) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const res = await axiosInstance.get<{ ok: boolean; data: Job }>(`/api/v1/jobs/${jobId}`);
        if (cancelled) return;
        setJob(res.data.data);
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

  // کی می‌تونه مدیریت کنه؟ (ادمین یا صاحب آگهی)
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

  // حذف
  async function onDelete() {
    if (!job) return;
    if (!confirm('آیا از حذف این فرصت مطمئن هستی؟')) return;
    setDeleting(true);
    setErr(null);
    try {
      await axiosInstance.delete(`/api/v1/jobs/${job._id}`);
      alert('فرصت با موفقیت حذف شد ✅');
      router.push('/jobs');
    } catch (e: unknown) {
      const ax = e as AxiosError<{ message?: string }>;
      setErr(ax.response?.data?.message ?? ax.message ?? 'حذف ناموفق بود');
    } finally {
      setDeleting(false);
    }
  }

  // تایید
  async function onApprove() {
    if (!job) return;
    setModerating(true);
    setErr(null);
    try {
      await axiosInstance.patch(`/api/v1/jobs/${job._id}/approve`);
      alert('آگهی تایید شد ✅');
      router.refresh();
    } catch (e: unknown) {
      const ax = e as AxiosError<{ message?: string }>;
      setErr(ax.response?.data?.message ?? ax.message ?? 'تایید ناموفق بود');
    } finally {
      setModerating(false);
    }
  }

  // رد
  async function onReject() {
    if (!job) return;
    if (!rejectReason.trim()) {
      alert('لطفاً دلیل رد را وارد کنید.');
      return;
    }
    setModerating(true);
    setErr(null);
    try {
      await axiosInstance.patch(`/api/v1/jobs/${job._id}/reject`, { reason: rejectReason.trim() });
      alert('آگهی رد شد ❌');
      router.refresh();
    } catch (e: unknown) {
      const ax = e as AxiosError<{ message?: string }>;
      setErr(ax.response?.data?.message ?? ax.message ?? 'رد آگهی ناموفق بود');
    } finally {
      setModerating(false);
    }
  }

  return (
    <main className="p-4 mx-auto max-w-5xl">
      {/* نوار بالا: برگشت + اکشن‌های مدیر */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <Link href="/jobs" className="rounded-lg border px-3 py-1 text-sm hover:bg-slate-50">
          ← بازگشت
        </Link>

        {canManage && (
          <div className="flex items-center gap-2">
            <Link
              href={`/jobs/${job?._id}/edit`}
              className="rounded-lg border px-3 py-1 text-sm hover:bg-slate-50"
            >
              ویرایش
            </Link>
            <button
              onClick={onDelete}
              disabled={deleting}
              className="rounded-lg bg-red-600 px-3 py-1 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
            >
              {deleting ? 'در حال حذف…' : 'حذف'}
            </button>
          </div>
        )}
      </div>

      {loading && (
        <div className="rounded-xl border bg-white p-4 text-center shadow-sm">در حال بارگذاری…</div>
      )}
      {err && <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-700">{err}</div>}

      {!loading && !err && job && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ستون محتوا */}
          <article className="lg:col-span-2 space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">{job.title}</h1>
                <StatusBadge status={job.status} title={job.rejectedReason ?? undefined} />
              </div>

              <div className="mt-2 text-xs sm:text-sm text-slate-500">
                {job.createdAt && <>ثبت: {new Date(job.createdAt).toLocaleString('fa-IR')}</>}
                {job.updatedAt && <> · بروزرسانی: {new Date(job.updatedAt).toLocaleString('fa-IR')}</>}
              </div>

              {job.description && (
                <p className="mt-4 leading-8 whitespace-pre-wrap text-slate-800">{job.description}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {typeof job.budget === 'number' && (
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="text-xs text-slate-500 mb-1">بودجه</div>
                  <div className="text-lg font-bold text-slate-900">
                    {job.budget.toLocaleString('fa-IR')}
                    <span className="mr-1 text-sm font-normal text-slate-500">تومان</span>
                  </div>
                </div>
              )}
              {job.city && (
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="text-xs text-slate-500 mb-1">شهر</div>
                  <div className="text-base font-semibold text-slate-900">{job.city}</div>
                </div>
              )}
            </div>
          </article>

          {/* سایدبار CTA به سبک کارت مرجع */}
          <aside className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="text-center">
                <div className="text-slate-800 font-semibold">آگهی مدلینگ</div>
                <div className="mt-1 text-xs text-slate-500">برای اقدام بعدی آماده‌ای؟</div>
                <button
                  className="mt-3 w-full rounded-xl bg-red-600 px-4 py-2.5 text-sm font-extrabold text-white transition hover:bg-red-700"
                  onClick={() => alert('اینجا می‌تونی اکشن اصلی‌ت رو وصل کنی (مثلاً درخواست همکاری)')}
                >
                  اقدام برای همکاری
                </button>
              </div>

              <ul className="mt-4 space-y-2 text-sm text-slate-700">
                <li className="flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
                  اطلاعات شفاف و منظم
                </li>
                <li className="flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-indigo-500" />
                  فضای گفت‌وگوی حرفه‌ای
                </li>
                <li className="flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-purple-500" />
                  مناسب برای تازه‌کار تا حرفه‌ای
                </li>
              </ul>
            </div>

            {isAdmin && job.status !== 'approved' && (
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
                <div className="font-semibold text-slate-800">مدیریت تایید</div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={onApprove}
                    disabled={moderating}
                    className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {moderating ? '...' : 'تایید'}
                  </button>
                  <input
                    className="flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                    placeholder="دلیل رد (اختیاری اما پیشنهاد می‌شود)"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                  />
                  <button
                    onClick={onReject}
                    disabled={moderating}
                    className="rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                  >
                    {moderating ? '...' : 'رد'}
                  </button>
                </div>
                {job.rejectedReason && (
                  <div className="text-xs text-rose-700">آخرین دلیل رد: {job.rejectedReason}</div>
                )}
              </div>
            )}
          </aside>
        </div>
      )}
    </main>
  );
}
