'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import type { AxiosError } from 'axios';
import { axiosInstance } from '../../../api/axios-instance';

type JobStatus = 'draft' | 'pending_review' | 'approved' | 'rejected';

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

function decodeJwt(token: string | null): Record<string, unknown> | null {
  if (!token) return null;
  try {
    const [, payload] = token.split('.');
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
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

// ---------- type guards ----------
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

  const token = useMemo(() => (typeof window !== 'undefined' ? localStorage.getItem('access_token') : null), []);
  const me = useMemo(() => extractMeFromToken(token), [token]);

  // فرم
  const [title, setTitle] = useState('');
  const [budget, setBudget] = useState<string>(''); 
  const [city, setCity] = useState('');
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);

  // وضعیت‌ها
  const [status, setStatus] = useState<JobStatus>('draft');
  const [expiryIso, setExpiryIso] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<string>('');

  // UI
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  // دریافت آگهی
  useEffect(() => {
    if (!jobId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const res = await axiosInstance.get(`/api/v1/jobs/${encodeURIComponent(jobId)}`);
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

  // شمارش معکوس
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

  const canSubmit =
    title.trim().length > 0 &&
    description.trim().length > 0 &&
    !!city &&
    !!date &&
    budget.trim().length > 0 &&
    termsAccepted === true;

  // ---------- API helpers ----------
  async function apiUpdateDraft(id: string, payload: Record<string, unknown>) {
    const res = await axiosInstance.patch(`/api/v1/jobs/${encodeURIComponent(id)}`, payload);
    return res.data as unknown;
  }

  async function apiSubmit(id: string, payload: Record<string, unknown>) {
    const paths = [
      `/api/v1/jobs/${encodeURIComponent(id)}/submit`,
      `/api/v1/jobs/submit/${encodeURIComponent(id)}`,
      `/api/jobs/${encodeURIComponent(id)}/submit`,
    ];
    const tried: string[] = [];
    for (const p of paths) {
      try {
        const res = await axiosInstance.post(p, payload);
        return { data: res.data as unknown, usedPath: p };
      } catch (e) {
        const ax = e as AxiosError;
        tried.push(p);
        if (ax.response?.status === 404) continue;
        throw e;
      }
    }
    console.error('Submit endpoint not found. Tried:', tried);
    throw new Error('آدرس ارسال برای بررسی یافت نشد (404). مسیرهای تست‌شده را در کنسول ببینید.');
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

      // ریدایرکت بعد از 1 ثانیه
      setTimeout(() => router.push(`/jobs/${jobId}`), 1000);
    } catch (e) {
      const ax = e as AxiosError<{ message?: string }>;
      setErr(ax.response?.data?.message ?? ax.message ?? 'ارسال ناموفق بود');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="p-4 max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <Link href={`/jobs/${jobId}`} className="px-3 py-1 rounded border hover:bg-gray-50">← بازگشت</Link>
        <h1 className="text-xl font-bold">ویرایش آگهی</h1>
      </div>

      {loading && <div>در حال بارگذاری…</div>}
      {err && <div className="text-red-600">{err}</div>}

      {!loading && !err && (
        <>
          <div className="flex items-center gap-2 text-sm">
            <span className="px-2 py-0.5 rounded-full border">
              وضعیت: <b className="ml-1">{status}</b>
            </span>
            {status === 'draft' && expiryIso && (
              <span className="px-2 py-0.5 rounded-full border bg-yellow-50">
                ⏳ حذف درافت: <b className="ml-1">{new Date(expiryIso).toLocaleString()}</b> — باقی‌مانده: <b>{countdown}</b>
              </span>
            )}
          </div>

          <form onSubmit={(e) => e.preventDefault()} className="space-y-3">
            <input
              className="w-full border rounded-lg p-2"
              placeholder="عنوان *"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />

            <div className="grid md:grid-cols-3 gap-4">
              <input
                className="w-full border rounded-lg p-2"
                placeholder="مبلغ (آفیش) *"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
              />
              <input
                className="w-full border rounded-lg p-2"
                placeholder="لوکیشن (شهر) *"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
              <input
                className="w-full border rounded-lg p-2"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            <textarea
              className="w-full border rounded-lg p-2"
              placeholder="توضیحات *"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
            />

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
              />
              <span>
                شرایط و قوانین را می‌پذیرم
                <a href="/terms" target="_blank" className="text-blue-600 mx-1 underline">مطالعه قوانین</a>
              </span>
            </label>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={saveDraft}
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-gray-800 text-white disabled:bg-gray-300"
              >
                {saving ? 'در حال ذخیره…' : 'ذخیره پیش‌نویس'}
              </button>

              <button
                type="button"
                onClick={submitForReview}
                disabled={!canSubmit || submitting}
                className="px-4 py-2 rounded-lg bg-emerald-600 text-white disabled:bg-gray-300"
              >
                {submitting ? 'در حال ارسال…' : 'ارسال برای بررسی'}
              </button>

              {msg && <div className="text-green-600 text-sm">{msg}</div>}
            </div>
          </form>
        </>
      )}
    </main>
  );
}
