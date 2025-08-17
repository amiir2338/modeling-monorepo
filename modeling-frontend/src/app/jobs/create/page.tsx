'use client';
import '../../repeat-guard';

import { useEffect, useMemo, useState } from 'react';
import type { AxiosError } from 'axios';
import { axiosInstance } from '../../api/axios-instance';
import JobForm, { JobFormValue, JobStatus } from '../../../components/jobs/JobForm';

/** ELI5: اطلاعات ساده از توکن برای تشخیص نقش */
type Me = { id: string; role: 'client' | 'admin' | 'user' | string };

function decodeJwt(token: string | null): Record<string, unknown> | null {
  if (!token) return null;
  try {
    const [, payload] = token.split('.');
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decodeURIComponent(escape(json))) as Record<string, unknown>;
  } catch {
    return null;
  }
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
  else if (Array.isArray(pid.roles) && pid.roles.length > 0) role = String(pid.roles[0]);
  else if (typeof (pid as { isAdmin?: boolean }).isAdmin === 'boolean')
    role = (pid as { isAdmin?: boolean }).isAdmin ? 'admin' : 'user';

  if (!id) return null;
  return { id: String(id), role: (role ?? 'user') as Me['role'] };
}

/** ELI5: نوع حداقلی برای جوابی که بک‌اند برمی‌گرداند */
type Job = {
  _id?: string;
  status?: JobStatus;
  draftExpiresAt?: string | null;
};

/** کمک‌تابع‌های امن برای تبدیل پاسخ به Job */
function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
function isJob(value: unknown): value is Job {
  return isObject(value) && ('_id' in value || 'status' in value || 'draftExpiresAt' in value);
}
function normalizeJobFromResponse(resp: unknown): Job | null {
  if (isJob(resp)) return resp;
  if (isObject(resp)) {
    const maybeJob = (resp as Record<string, unknown>)['job'];
    if (isJob(maybeJob)) return maybeJob;
    const data = (resp as Record<string, unknown>)['data'];
    if (isJob(data)) return data;
    if (isObject(data)) {
      const dataJob = (data as Record<string, unknown>)['job'];
      if (isJob(dataJob)) return dataJob;
    }
  }
  return null;
}

export default function CreateJobPage() {
  const token = useMemo(() => (typeof window !== 'undefined' ? localStorage.getItem('access_token') : null), []);
  const me = useMemo(() => extractMeFromToken(token), [token]);

  /** ELI5: اگر کاربر client باشد، clientId را خودکار پر می‌کنیم تا اصلاً لازم نباشد نشانش دهیم */
  const [clientId, setClientId] = useState('');
  useEffect(() => {
    if (me?.role === 'client' && me.id && !clientId) setClientId(me.id);
  }, [me, clientId]);

  // فرم
  const [form, setForm] = useState<JobFormValue>({
    title: '',
    description: '',
    budgetString: '',
    city: '',
    date: '',
    termsAccepted: false,
  });

  // وضعیت‌ها
  const [job, setJob] = useState<Job | null>(null);
  const [status, setStatus] = useState<JobStatus>('draft');
  const [savingDraft, setSavingDraft] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // API helpers
  async function apiCreateDraft(payload: Record<string, unknown>) {
    const res = await axiosInstance.post('/api/v1/jobs', payload);
    return res.data as unknown;
  }
  async function apiUpdateDraft(id: string, payload: Record<string, unknown>) {
    const res = await axiosInstance.patch(`/api/v1/jobs/${encodeURIComponent(id)}`, payload);
    return res.data as unknown;
  }
  /** ELI5: مسیر submit را انعطاف‌پذیر کردیم تا اگر بک‌اند یکی از این‌ها را داشت، کار کند */
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

  const onChange = (patch: Partial<JobFormValue>) => setForm((f) => ({ ...f, ...patch }));

  // ذخیره پیش‌نویس
  const handleSaveDraft = async () => {
    if (!me) { setErr('ابتدا وارد شوید.'); return; }
    if (!clientId.trim()) { setErr('clientId الزامی است.'); return; }

    setSavingDraft(true); setErr(null); setMsg(null);

    const payload: Record<string, unknown> = {
      title: form.title.trim(),
      description: form.description.trim(),
      city: form.city.trim() || null,
      date: form.date || null,
      status: 'draft',
      budget: form.budgetString.trim()
        ? ((): number | null => {
            const n = Number(form.budgetString.replace(/[^\d.-]/g, ''));
            return Number.isFinite(n) && n >= 0 ? n : null;
          })()
        : null,
      clientId: clientId || undefined,
    };

    try {
      let created: Job | null = job;
      if (!created?._id) {
        const data = await apiCreateDraft(payload);
        created = normalizeJobFromResponse(data);
        if (!created?._id) throw new Error('پاسخ ساخت پیش‌نویس معتبر نیست.');
        setJob(created);
      } else {
        await apiUpdateDraft(created._id!, payload);
      }
      setStatus('draft');
      setMsg('پیش‌نویس ذخیره شد ✅');
    } catch (e) {
      const ax = e as AxiosError<{ message?: string }>;
      setErr(ax.response?.data?.message ?? ax.message ?? 'ذخیره پیش‌نویس ناموفق بود');
    } finally {
      setSavingDraft(false);
    }
  };

  // ارسال برای بررسی
  const handleSubmitForReview = async () => {
    if (!me) { setErr('ابتدا وارد شوید.'); return; }
    if (!(form.title.trim() && form.description.trim() && form.city.trim() && form.date && form.budgetString.trim() && form.termsAccepted)) {
      setErr('برای ارسال، همه فیلدها را کامل و قوانین را تأیید کنید.');
      return;
    }
    setErr(null); setMsg(null); setSubmitting(true);
    try {
      let id = job?._id;
      if (!id) {
        const created = normalizeJobFromResponse(await apiCreateDraft({
          title: form.title.trim(),
          description: form.description.trim(),
          city: form.city.trim() || null,
          date: form.date || null,
          status: 'draft',
          budget: form.budgetString.trim()
            ? ((): number | null => {
                const n = Number(form.budgetString.replace(/[^\d.-]/g, ''));
                return Number.isFinite(n) && n >= 0 ? n : null;
              })()
            : null,
          clientId: clientId || undefined,
        }));
        if (!created?._id) throw new Error('پاسخ ساخت پیش‌نویس معتبر نیست.');
        setJob(created);
        id = created._id!;
      }
      const { data, usedPath } = await apiSubmit(id!, { termsAccepted: true });
      console.log('Submit used path (create):', usedPath);
      const updated = normalizeJobFromResponse(data);
      if (!updated) throw new Error('پاسخ سرور نامعتبر است');
      setMsg('برای بررسی ارسال شد ✅');
      setStatus(updated.status ?? 'pending_review');
    } catch (e) {
      const ax = e as AxiosError<{ message?: string }>;
      setErr(ax.response?.data?.message ?? ax.message ?? 'ارسال ناموفق بود');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="p-4 mx-auto max-w-2xl space-y-4">
      {/* ⚠️ تیتر صفحه را حذف کردیم تا با تیتر داخل JobForm تکراری نشود (منبع تکرار: :contentReference[oaicite:6]{index=6}) */}

      {/* فقط اگر clientId را از توکن نفهمیدیم، این فیلد را نشان بده */}
      {!clientId && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <label className="text-sm">clientId (الزامی)</label>
          <input
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            placeholder="clientId"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
          />
          <p className="mt-1 text-xs text-slate-500">اگر نقش شما «client» باشد معمولاً به‌صورت خودکار پر می‌شود.</p>
        </div>
      )}

      <JobForm
        mode="create"
        value={form}
        status={status}
        draftExpiresAt={job?.draftExpiresAt ?? null}
        savingDraft={savingDraft}
        submitting={submitting}
        error={err}
        message={msg}
        onChange={onChange}
        onSaveDraft={handleSaveDraft}
        onSubmitForReview={handleSubmitForReview}
      />
    </main>
  );
}
