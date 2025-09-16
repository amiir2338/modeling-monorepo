'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import type { AxiosError } from 'axios';
import http from '@/lib/api/http';

type JobStatus = 'draft' | 'pending_review' | 'approved' | 'rejected';

/** شکل کامل‌تر آگهی برای صفحه ادیت */
type Job = {
  _id: string;
  title: string;
  description: string;
  budget: number | null;
  city: string | null;
  date: string | null;
  status: JobStatus;
  draftExpiresAt?: string | null;
};

type Me = { id: string; role: 'client' | 'admin' | 'user' | string };

/** 🟢 ELI5: از توکن (اگر وجود داشت) آیدی/نقش را در می‌آوریم تا در کلاینت گارد ساده بزنیم */
function decodeJwt(token: string | null): Record<string, unknown> | null {
  if (!token) return null;
  try {
    const [, payload] = token.split('.');
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decodeURIComponent(escape(json))) as Record<string, unknown>;
  } catch { return null; }
}
function extractMeFromToken(token: string | null): Me | null {
  const p = decodeJwt(token);
  if (!p) return null;
  const pid = p as Record<string, unknown>;
  const id =
    (pid.id as string | undefined) ??
    (pid.userId as string | undefined) ??
    (pid.user_id as string | undefined) ??
    (pid.sub as string | undefined) ??
    (pid.uid as string | undefined) ??
    ((pid.user as Record<string, unknown> | undefined)?._id as string | undefined) ??
    ((pid.user as Record<string, unknown> | undefined)?.id as string | undefined) ??
    null;

  let role: string | undefined;
  if (typeof pid.role === 'string') role = pid.role as string;
  else if (Array.isArray(pid.roles) && pid.roles.length) role = String(pid.roles[0]);
  else if (typeof (pid as { isAdmin?: boolean }).isAdmin === 'boolean') role = (pid as { isAdmin?: boolean }).isAdmin ? 'admin' : 'user';

  if (!id) return null;
  return { id: String(id), role: (role ?? 'user') as Me['role'] };
}

/** 🟢 ELI5: هر شکلی سرور Job را برگرداند، این نرمالایزر «خودش» پیدایش می‌کند */
function isObject(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null;
}
function isJob(x: unknown): x is Job {
  return isObject(x) && typeof x['_id'] === 'string';
}
function normalizeJobFromResponse(resp: unknown): Job | null {
  if (isJob(resp)) return resp;
  if (isObject(resp)) {
    const job = resp['job'];
    if (isJob(job)) return job;
    const data = resp['data'];
    if (isJob(data)) return data;
    if (isObject(data)) {
      const dataJob = data['job'];
      if (isJob(dataJob)) return dataJob;
    }
  }
  return null;
}

export default function EditJobPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const jobId = params?.id ?? '';

  // 🟢 یوزر ساده از توکن لوکال (اگه اصلاً داشتی؛ برای گارد UI)
  const token = useMemo(() => (typeof window !== 'undefined' ? localStorage.getItem('access_token') : null), []);
  const me = useMemo(() => extractMeFromToken(token), [token]);

  // 🟢 فرم
  const [title, setTitle] = useState('');
  const [budget, setBudget] = useState<string>(''); // ورودی عددی را رشته نگه می‌داریم تا راحت فرمت کنیم
  const [city, setCity] = useState('');
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);

  // 🟢 وضعیت‌ها
  const [status, setStatus] = useState<JobStatus>('draft');
  const [expiryIso, setExpiryIso] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<string>('');

  // 🟢 UI
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  /** 🟢 واکشی آگهی و پرکردن فرم */
  useEffect(() => {
    if (!jobId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const res = await http.get(`/api/v1/jobs/${encodeURIComponent(jobId)}`, { withCredentials: true });
        const j = normalizeJobFromResponse(res.data);
        if (!j) throw new Error('پاسخ سرور نامعتبر است');
        if (cancelled) return;

        setTitle(j.title ?? '');
        setDescription(j.description ?? '');
        setBudget(typeof j.budget === 'number' ? String(j.budget) : '');
        setCity(j.city ?? '');
        setDate(j.date ?? '');
        setStatus(j.status ?? 'draft');
        setExpiryIso(j.draftExpiresAt ?? null);
      } catch (e) {
        const ax = e as AxiosError<{ message?: string }>;
        if (cancelled) return;
        setErr(ax.response?.data?.message ?? ax.message ?? 'خطا در دریافت اطلاعات آگهی');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [jobId]);

  /** 🟢 نمایش شمارش معکوس انقضای درفت (اگر بک‌اند داد) */
  useEffect(() => {
    if (!expiryIso) return;
    const tick = () => {
      const now = Date.now();
      const end = new Date(expiryIso).getTime();
      const diff = end - now;
      if (diff <= 0) { setCountdown('منقضی شد — این آگهی ممکن است هر لحظه حذف شود.'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setCountdown(`${h}س ${m}د ${s}ث`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiryIso]);

  /** 🟢 فرم آمادهٔ ارسال است؟ */
  const canSubmit =
    title.trim().length > 0 &&
    description.trim().length > 0 &&
    !!city &&
    !!date &&
    budget.trim().length > 0 &&
    termsAccepted === true;

  // ---------- API helpers ----------
  async function apiUpdateDraft(id: string, payload: Record<string, unknown>) {
    const res = await http.patch(`/api/v1/jobs/${encodeURIComponent(id)}`, payload, { withCredentials: true });
    return res.data as unknown;
  }

  async function apiSubmit(id: string, payload: Record<string, unknown>) {
    // بعضی پروژه‌ها مسیر متفاوت دارند؛ سه مسیر رایج را تست می‌کنیم
    const paths = [
      `/api/v1/jobs/${encodeURIComponent(id)}/submit`,
      `/api/v1/jobs/submit/${encodeURIComponent(id)}`,
      `/api/jobs/${encodeURIComponent(id)}/submit`,
    ];
    const tried: string[] = [];
    for (const p of paths) {
      try {
        const res = await http.post(p, payload, { withCredentials: true });
        return { data: res.data as unknown, usedPath: p };
      } catch (e) {
        const ax = e as AxiosError;
        tried.push(p);
        if (ax.response?.status === 404) continue; // اگر 404 بود، مسیر بعدی را امتحان کن
        throw e;
      }
    }
    console.error('Submit endpoint not found. Tried:', tried);
    throw new Error('آدرس «ارسال برای بررسی» یافت نشد (404). مسیرهای تست‌شده را در کنسول ببینید.');
  }

  // ---------- Actions ----------
  async function saveDraft() {
    if (!me) { setErr('ابتدا وارد شوید.'); return; }
    setSaving(true); setErr(null); setMsg(null);

    const payload: Record<string, unknown> = {
      title: title.trim(),
      description: description.trim(),
      city: city.trim() || null,
      date: date || null,
      status: 'draft',
      budget: budget.trim()
        ? ((): number | null => {
            const n = Number(budget.replace(/[^\d.-]/g, ''));
            return Number.isFinite(n) && n >= 0 ? n : null;
          })()
        : null,
    };

    try {
      await apiUpdateDraft(jobId, payload);
      setMsg('پیش‌نویس ذخیره شد ✅');
    } catch (e) {
      const ax = e as AxiosError<{ message?: string }>;
      setErr(ax.response?.data?.message ?? ax.message ?? 'ذخیره پیش‌نویس ناموفق بود');
    } finally {
      setSaving(false);
    }
  }

  async function submitForReview() {
    if (!me) { setErr('ابتدا وارد شوید.'); return; }
    if (!canSubmit) { setErr('برای ارسال، فیلدها را کامل و قوانین را تایید کنید.'); return; }

    setSubmitting(true); setErr(null); setMsg(null);
    try {
      const { data, usedPath } = await apiSubmit(jobId, { termsAccepted: true });
      console.log('Submit used path (edit):', usedPath);

      const updated = normalizeJobFromResponse(data);
      if (!updated) throw new Error('پاسخ سرور نامعتبر است');

      setMsg('برای بررسی ارسال شد ✅');
      setStatus(updated.status ?? 'pending_review');
      setExpiryIso(null);

      setTimeout(() => router.push(`/jobs/${jobId}`), 1000);
    } catch (e) {
      const ax = e as AxiosError<{ message?: string }>;
      setErr(ax.response?.data?.message ?? ax.message ?? 'ارسال ناموفق بود');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="p-4 mx-auto max-w-2xl space-y-4">
      {/* نوار بالا: برگشت + تیتر */}
      <div className="flex items-center justify-between">
        <Link href={`/jobs/${jobId}`} className="rounded-lg border px-3 py-1 text-sm hover:bg-slate-50">
          ← بازگشت
        </Link>
        <h1 className="text-xl font-bold">ویرایش آگهی</h1>
      </div>

      {loading && <div className="rounded-xl border bg-white p-4 text-center shadow-sm">در حال بارگذاری…</div>}
      {err && <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-700">{err}</div>}

      {!loading && !err && (
        <>
          {/* وضعیت و شمارش معکوس پیش‌نویس (اگر وجود داشته باشد) */}
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="rounded-full border px-3 py-1">
              وضعیت: <b className="ml-1">{status}</b>
            </span>
            {status === 'draft' && expiryIso && (
              <span className="rounded-full border bg-amber-50 px-3 py-1">
                ⏳ حذف درافت: <b className="ml-1">{new Date(expiryIso).toLocaleString()}</b> — باقی‌مانده: <b>{countdown}</b>
              </span>
            )}
          </div>

          {/* فرم ساده (بدون وابستگی به JobForm) */}
          <form onSubmit={(e) => e.preventDefault()} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            {/* عنوان */}
            <div>
              <label className="mb-1 block text-sm text-slate-700">
                موضوع <span className="text-rose-500">*</span>
              </label>
              <input
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="عنوان آگهی…"
              />
            </div>

            {/* توضیح */}
            <div>
              <label className="mb-1 block text-sm text-slate-700">
                توضیح <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={5}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="جزئیات پروژه، نیازمندی‌ها، زمان و …"
              />
            </div>

            {/* بودجه + شهر + تاریخ */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="mb-1 block text-sm text-slate-700">مبلغ (آفیش)</label>
                <input
                  inputMode="numeric"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  placeholder="مثلاً 2500000"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-700">شهر</label>
                <input
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="مثلاً تهران"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-700">تاریخ برگزاری/شروع</label>
                <input
                  type="date"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                  value={date ?? ''}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
            </div>

            {/* قوانین */}
            <div className="flex items-start gap-2 rounded-xl border border-slate-200 p-3">
              <input
                id="terms"
                type="checkbox"
                className="mt-1 size-4 accent-indigo-600"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
              />
              <label htmlFor="terms" className="text-sm">
                <span className="font-medium">شرایط و قوانین</span> را می‌پذیرم و مطالعه کردم.
              </label>
            </div>

            {/* پیام‌ها */}
            {(msg || err) && (
              <div className={`rounded-xl border p-3 text-sm ${err ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
                {err ?? msg}
              </div>
            )}

            {/* دکمه‌ها */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={saveDraft}
                disabled={saving}
                className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                {saving ? '...' : 'ذخیره پیش‌نویس'}
              </button>

              <button
                type="button"
                onClick={submitForReview}
                disabled={!canSubmit || submitting}
                className="inline-flex items-center justify-center rounded-full bg-red-600 px-5 py-2.5 text-sm font-extrabold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {submitting ? '...' : 'ارسال برای بررسی'}
              </button>
            </div>
          </form>
        </>
      )}
    </main>
  );
}
