'use client';

import { useState } from 'react';
import type { AxiosError } from 'axios';
import { axiosInstance } from '../../api/axios-instance';


type JobCreatePayload = {
  title: string;
  description: string;
  city?: string | null;
  date?: string | null;
  budget?: number | null;
  status?: 'draft';
};

type CreateResponse = {
  ok?: boolean;
  job?: { _id: string };
  message?: string;
};

export default function CreateJobPage() {
  const [form, setForm] = useState<JobCreatePayload>({
    title: '',
    description: '',
    city: '',
    date: '',
    budget: null,
    status: 'draft',
  });

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const onChange = (patch: Partial<JobCreatePayload>) =>
    setForm((f) => ({ ...f, ...patch }));

  const saveDraft = async () => {
    setErr(null); setMsg(null);
    try {
      setSaving(true);
      const res = await axiosInstance.post<CreateResponse>('/v1/jobs', form);
      if (res.data?.job?._id) {
        setMsg('پیش‌نویس ذخیره شد ✅');
      } else {
        setErr(res.data?.message || 'ذخیره انجام نشد');
      }
    } catch (e) {
      const ax = e as AxiosError<{ message?: string }>;
      setErr(ax.response?.data?.message || ax.message || 'خطا در ذخیره');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="p-4 max-w-2xl mx-auto space-y-3">
      <h1 className="text-lg font-bold">ایجاد فرصت</h1>

      <input
        className="border rounded-lg p-2 w-full"
        placeholder="عنوان"
        value={form.title}
        onChange={(e) => onChange({ title: e.target.value })}
      />
      <textarea
        className="border rounded-lg p-2 w-full"
        placeholder="توضیح"
        value={form.description}
        onChange={(e) => onChange({ description: e.target.value })}
      />
      <input
        className="border rounded-lg p-2 w-full"
        placeholder="شهر"
        value={form.city ?? ''}
        onChange={(e) => onChange({ city: e.target.value })}
      />
      <input
        className="border rounded-lg p-2 w-full"
        placeholder="yyyy-mm-dd"
        value={form.date ?? ''}
        onChange={(e) => onChange({ date: e.target.value })}
      />
      <input
        className="border rounded-lg p-2 w-full"
        placeholder="بودجه (عدد)"
        value={form.budget ?? ''}
        onChange={(e) => {
          const n = Number((e.target.value || '').replace(/[^\d.-]/g, ''));
          onChange({ budget: Number.isFinite(n) ? n : null });
        }}
      />

      <div className="flex gap-2">
        <button
          className="px-3 py-2 rounded-lg bg-black text-white disabled:opacity-50"
          disabled={saving}
          onClick={saveDraft}
        >
          ذخیره پیش‌نویس
        </button>
      </div>

      {msg && <div className="text-green-600">{msg}</div>}
      {err && <div className="text-red-600">{err}</div>}
    </main>
  );
}
