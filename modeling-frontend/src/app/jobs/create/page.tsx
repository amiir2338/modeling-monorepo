'use client';
import '../../repeat-guard';

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

/** Ø¨Ø¯ÙˆÙ† any: Ù‡Ø± Ø³Ø§Ø®ØªØ§Ø± Ø±Ø§ÛŒØ¬ Ù¾Ø§Ø³Ø® Ø±Ø§ Ø¨Ù‡ Job ØªØ¨Ø¯ÛŒÙ„ Ù…ÛŒâ€ŒÚ©Ù†Ø¯ */
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

  // ÙØ±Ù…
  const [form, setForm] = useState<JobFormValue>({
    title: '',
    description: '',
    budgetString: '',
    city: '',
    date: '',
    termsAccepted: false,
  });

  // ÙˆØ¶Ø¹ÛŒØªâ€ŒÙ‡Ø§
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
   * Ø§Ø±Ø³Ø§Ù„ Ø¨Ø±Ø§ÛŒ Ø¨Ø±Ø±Ø³ÛŒ Ø¨Ø§ fallback Ù…Ø³ÛŒØ±Ù‡Ø§
   * Ø¨Ø±Ù…ÛŒâ€ŒÚ¯Ø±Ø¯Ø§Ù†Ø¯: { data, usedPath }
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
          // Ù…Ø³ÛŒØ± Ø¨Ø¹Ø¯ÛŒ Ø±Ø§ Ø§Ù…ØªØ­Ø§Ù† Ú©Ù†
          continue;
        }
        // Ø®Ø·Ø§Ù‡Ø§ÛŒ ØºÛŒØ± 404 Ø±Ø§ Ù‡Ù…ÙˆÙ†Ø¬Ø§ Ù¾Ø§Ø³ Ø¨Ø¯Ù‡ Ø¨ÛŒØ±ÙˆÙ†
        throw e;
      }
    }
    // Ø§Ú¯Ø± Ø¨Ù‡ Ø§ÛŒÙ†Ø¬Ø§ Ø±Ø³ÛŒØ¯ ÛŒØ¹Ù†ÛŒ Ù‡Ù…Ù‡ Ù…Ø³ÛŒØ±Ù‡Ø§ 404 Ø´Ø¯Ù†Ø¯
    console.error('Submit endpoint not found. Tried:', tried);
    throw new Error('Ø¢Ø¯Ø±Ø³ Ø§Ø±Ø³Ø§Ù„ Ø¨Ø±Ø§ÛŒ Ø¨Ø±Ø±Ø³ÛŒ ÛŒØ§ÙØª Ù†Ø´Ø¯ (404). Ù…Ø³ÛŒØ±Ù‡Ø§ÛŒ ØªØ³Øªâ€ŒØ´Ø¯Ù‡ Ø±Ø§ Ø¯Ø± Ú©Ù†Ø³ÙˆÙ„ Ø¨Ø¨ÛŒÙ†ÛŒØ¯.');
  }

  const onChange = (patch: Partial<JobFormValue>) => {
    setForm((f) => ({ ...f, ...patch }));
  };

  // Ø°Ø®ÛŒØ±Ù‡ Ù¾ÛŒØ´â€ŒÙ†ÙˆÛŒØ³ (Ø¨Ø¯ÙˆÙ† ØªÙ…Ø¯ÛŒØ¯ Ø§Ù†Ù‚Ø¶Ø§ Ø³Ù…Øª Ø³Ø±ÙˆØ±)
  const handleSaveDraft = async () => {
    if (!me) { setErr('Ø§Ø¨ØªØ¯Ø§ ÙˆØ§Ø±Ø¯ Ø´ÙˆÛŒØ¯.'); return; }
    if (!clientId.trim()) { setErr('clientId Ø§Ù„Ø²Ø§Ù…ÛŒ Ø§Ø³Øª.'); return; }
    if (!(form.title.trim() && form.description.trim())) { setErr('Ø¨Ø±Ø§ÛŒ Ù¾ÛŒØ´â€ŒÙ†ÙˆÛŒØ³ØŒ Ù…ÙˆØ¶ÙˆØ¹ Ùˆ ØªÙˆØ¶ÛŒØ­ Ú©Ø§ÙÛŒ Ø§Ø³Øª.'); return; }

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
        // Ø³Ø§Ø®Øª Ø¯Ø±Ø§ÙØª Ø¬Ø¯ÛŒØ¯
        const data = await apiCreateDraft(payload);
        const saved = normalizeJobFromResponse(data);
        if (!saved) throw new Error('Ù¾Ø§Ø³Ø® Ø³Ø±ÙˆØ± Ù†Ø§Ù…Ø¹ØªØ¨Ø± Ø§Ø³Øª');
        setJob(saved);
        setStatus(saved.status ?? 'draft');
        setMsg('Ù¾ÛŒØ´â€ŒÙ†ÙˆÛŒØ³ Ø°Ø®ÛŒØ±Ù‡ Ø´Ø¯ âœ…');
      } else {
        // Ø¢Ù¾Ø¯ÛŒØª Ø¯Ø±Ø§ÙØª Ù…ÙˆØ¬ÙˆØ¯
        const data = await apiUpdateDraft(job._id, payload);
        const saved = normalizeJobFromResponse(data);
        if (saved) {
          setJob((prev) => ({
            ...((prev ?? {}) as Job),
            ...saved,
          }));
          setStatus(saved.status ?? 'draft');
        }
        setMsg('Ù¾ÛŒØ´â€ŒÙ†ÙˆÛŒØ³ Ø¨Ù‡â€ŒØ±ÙˆØ²Ø±Ø³Ø§Ù†ÛŒ Ø´Ø¯ âœ…');
      }
    } catch (e) {
      const ax = e as AxiosError<{ message?: string }>;
      setErr(ax.response?.data?.message ?? ax.message ?? 'Ø®Ø·Ø§ Ø¯Ø± Ø°Ø®ÛŒØ±Ù‡ Ù¾ÛŒØ´â€ŒÙ†ÙˆÛŒØ³');
    } finally {
      setSavingDraft(false);
    }
  };

  // Ø§Ø±Ø³Ø§Ù„ Ø¨Ø±Ø§ÛŒ Ø¨Ø±Ø±Ø³ÛŒ
  const handleSubmitForReview = async () => {
    if (!me) { setErr('Ø§Ø¨ØªØ¯Ø§ ÙˆØ§Ø±Ø¯ Ø´ÙˆÛŒØ¯.'); return; }
    if (!job?._id) { setErr('Ø§Ø¨ØªØ¯Ø§ Ù¾ÛŒØ´â€ŒÙ†ÙˆÛŒØ³ Ø±Ø§ Ø°Ø®ÛŒØ±Ù‡ Ú©Ù†ÛŒØ¯.'); return; }

    // ÙˆÙ„ÛŒØ¯ÛŒØ´Ù† Ú©Ù„Ø§ÛŒÙ†Øª
    if (!(form.title.trim() && form.description.trim() && form.city.trim() && form.date && form.budgetString.trim() && form.termsAccepted)) {
      setErr('Ø¨Ø±Ø§ÛŒ Ø§Ø±Ø³Ø§Ù„ØŒ Ù‡Ù…Ù‡ ÙÛŒÙ„Ø¯Ù‡Ø§ Ø±Ø§ Ú©Ø§Ù…Ù„ Ùˆ Ù‚ÙˆØ§Ù†ÛŒÙ† Ø±Ø§ ØªØ§ÛŒÛŒØ¯ Ú©Ù†ÛŒØ¯.');
      return;
    }

    setErr(null);
    setMsg(null);

    try {
      setSubmitting(true);
      const { data, usedPath } = await apiSubmit(job._id, { termsAccepted: true });
      console.log('Submit used path:', usedPath); // Ø¨Ø±Ø§ÛŒ Ø¯ÛŒØ¨Ø§Ú¯ Ù…Ø³ÛŒØ± Ø¯Ø±Ø³Øª

      const updated = normalizeJobFromResponse(data);
      if (!updated) throw new Error('Ù¾Ø§Ø³Ø® Ø³Ø±ÙˆØ± Ù†Ø§Ù…Ø¹ØªØ¨Ø± Ø§Ø³Øª');

      setJob((prev) => ({
        ...((prev ?? {}) as Job),
        ...updated,
        draftExpiresAt: null,
      }));
      setStatus(updated.status ?? 'pending_review');
      setMsg('Ø¨Ø±Ø§ÛŒ Ø¨Ø±Ø±Ø³ÛŒ Ø§Ø±Ø³Ø§Ù„ Ø´Ø¯ âœ…');
    } catch (e) {
      const ax = e as AxiosError<{ message?: string }>;
      setErr(ax.response?.data?.message ?? ax.message ?? 'Ø®Ø·Ø§ Ø¯Ø± Ø§Ø±Ø³Ø§Ù„ Ø¨Ø±Ø§ÛŒ Ø¨Ø±Ø±Ø³ÛŒ');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="p-4 max-w-2xl mx-auto space-y-4">
      <h1 className="text-xl font-bold">Ø«Ø¨Øª Ø¢Ú¯Ù‡ÛŒ Ù…Ø¯Ù„ÛŒÙ†Ú¯ âœ¨</h1>

      {/* clientId (Ù…Ø·Ø§Ø¨Ù‚ Ø¨Ú©â€ŒØ§Ù†Ø¯ Ø´Ù…Ø§) */}
      <div className="space-y-1">
        <label className="text-sm">clientId (Ø§Ù„Ø²Ø§Ù…ÛŒ)</label>
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

