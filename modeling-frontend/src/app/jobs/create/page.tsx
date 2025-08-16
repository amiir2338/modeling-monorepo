'use client';

import { useEffect, useMemo, useState } from 'react';
import type { AxiosError } from 'axios';
import { axiosInstance } from '../../api/axios-instance';
import JobForm, { JobFormValue, JobStatus } from '../../../components/jobs/JobForm';

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

type Job = {
  _id?: string;
  status?: JobStatus;
  draftExpiresAt?: string | null;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
function isJob(value: unknown): value is Job {
  return isObject(value) && ('_id' in value || 'status' in value || 'draftExpiresAt' in value);
}

/** بدون any: هر ساختار رایج پاسخ را به Job تبدیل می‌کند */
function normalizeJobFromResponse(resp: unknown): Job | null {
  if (isJob(resp)) return resp;

  if (isObject(resp)) {
    const maybeJob = resp['job'];
    if (isJob(maybeJob)) return maybeJob;

    const data = resp['data'];
    if (isJob(data)) return data;

    if (isObject(data)) {
      const dataJob = data['job'];
      if (isJob(dataJob)) return dataJob;
    }
  }
  return null;
}

export default function CreateJobPage() {
  const token = useMemo(() => (typeof window !== 'undefined' ? localStorage.getItem('access_token') : null), []);
  const me = useMemo(() => extractMeFromToken(token), [token]);

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

  /**
   * ارسال برای بررسی با fallback مسیرها
   * برمی‌گرداند: { data, usedPath }
   */
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
        if (ax.response?.status === 404) {
          // مسیر بعدی را امتحان کن
          continue;
        }
        // خطاهای غیر 404 را همونجا پاس بده بیرون
        throw e;
      }
    }
    // اگر به اینجا رسید یعنی همه مسیرها 404 شدند
    console.error('Submit endpoint not found. Tried:', tried);
    throw new Error('آدرس ارسال برای بررسی یافت نشد (404). مسیرهای تست‌شده را در کنسول ببینید.');
  }

  const onChange = (patch: Partial<JobFormValue>) => {
    setForm((f) => ({ ...f, ...patch }));
  };

  // ذخیره پیش‌نویس (بدون تمدید انقضا سمت سرور)
  const handleSaveDraft = async () => {
    if (!me) { setErr('ابتدا وارد شوید.'); return; }
    if (!clientId.trim()) { setErr('clientId الزامی است.'); return; }
    if (!(form.title.trim() && form.description.trim())) { setErr('برای پیش‌نویس، موضوع و توضیح کافی است.'); return; }

    setErr(null);
    setMsg(null);

    const payload: Record<string, unknown> = {
      title: form.title.trim(),
      description: form.description.trim(),
      clientId: clientId.trim(),
      city: form.city.trim() || null,
      date: form.date || null,
      status: 'draft',
      budget: form.budgetString.trim()
        ? ((): number | null => {
            const n = Number(form.budgetString.replace(/[^\d.-]/g, ''));
            return Number.isFinite(n) && n >= 0 ? n : null;
          })()
        : null,
    };

    try {
      setSavingDraft(true);

      if (!job?._id) {
        // ساخت درافت جدید
        const data = await apiCreateDraft(payload);
        const saved = normalizeJobFromResponse(data);
        if (!saved) throw new Error('پاسخ سرور نامعتبر است');
        setJob(saved);
        setStatus(saved.status ?? 'draft');
        setMsg('پیش‌نویس ذخیره شد ✅');
      } else {
        // آپدیت درافت موجود
        const data = await apiUpdateDraft(job._id, payload);
        const saved = normalizeJobFromResponse(data);
        if (saved) {
          setJob((prev) => ({
            ...((prev ?? {}) as Job),
            ...saved,
          }));
          setStatus(saved.status ?? 'draft');
        }
        setMsg('پیش‌نویس به‌روزرسانی شد ✅');
      }
    } catch (e) {
      const ax = e as AxiosError<{ message?: string }>;
      setErr(ax.response?.data?.message ?? ax.message ?? 'خطا در ذخیره پیش‌نویس');
    } finally {
      setSavingDraft(false);
    }
  };

  // ارسال برای بررسی
  const handleSubmitForReview = async () => {
    if (!me) { setErr('ابتدا وارد شوید.'); return; }
    if (!job?._id) { setErr('ابتدا پیش‌نویس را ذخیره کنید.'); return; }

    // ولیدیشن کلاینت
    if (!(form.title.trim() && form.description.trim() && form.city.trim() && form.date && form.budgetString.trim() && form.termsAccepted)) {
      setErr('برای ارسال، همه فیلدها را کامل و قوانین را تایید کنید.');
      return;
    }

    setErr(null);
    setMsg(null);

    try {
      setSubmitting(true);
      const { data, usedPath } = await apiSubmit(job._id, { termsAccepted: true });
      console.log('Submit used path:', usedPath); // برای دیباگ مسیر درست

      const updated = normalizeJobFromResponse(data);
      if (!updated) throw new Error('پاسخ سرور نامعتبر است');

      setJob((prev) => ({
        ...((prev ?? {}) as Job),
        ...updated,
        draftExpiresAt: null,
      }));
      setStatus(updated.status ?? 'pending_review');
      setMsg('برای بررسی ارسال شد ✅');
    } catch (e) {
      const ax = e as AxiosError<{ message?: string }>;
      setErr(ax.response?.data?.message ?? ax.message ?? 'خطا در ارسال برای بررسی');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="p-4 max-w-2xl mx-auto space-y-4">
      <h1 className="text-xl font-bold">ثبت آگهی مدلینگ ✨</h1>

      {/* clientId (مطابق بک‌اند شما) */}
      <div className="space-y-1">
        <label className="text-sm">clientId (الزامی)</label>
        <input
          className="w-full border rounded-lg p-2"
          placeholder="clientId"
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
        />
      </div>

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
