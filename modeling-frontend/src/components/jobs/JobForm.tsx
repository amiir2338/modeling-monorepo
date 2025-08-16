'use client';

import { useEffect, useMemo, useState } from 'react';

export type JobStatus = 'draft' | 'pending_review' | 'approved' | 'rejected';

export type JobFormValue = {
  title: string;
  description: string;
  budgetString: string;  // ورودی کاربر برای مبلغ (رشته)
  city: string;
  date: string;          // yyyy-mm-dd
  termsAccepted: boolean;
};

type Props = {
  mode: 'create' | 'edit';
  value: JobFormValue;
  status?: JobStatus;
  draftExpiresAt?: string | null;       // ISO
  savingDraft?: boolean;
  submitting?: boolean;
  error?: string | null;
  message?: string | null;
  onChange: (patch: Partial<JobFormValue>) => void;
  onSaveDraft: () => void;
  onSubmitForReview: () => void;
};

export default function JobForm({
  mode,
  value,
  status = 'draft',
  draftExpiresAt,
  savingDraft = false,
  submitting = false,
  error,
  message,
  onChange,
  onSaveDraft,
  onSubmitForReview,
}: Props) {
  const [countdown, setCountdown] = useState('');

  // برچسب حالت فرم برای استفاده از prop و حذف خطای unused
  const modeLabel = mode === 'create' ? 'ایجاد' : 'ویرایش';

  // شمارش معکوس حذف درافت
  useEffect(() => {
    if (!draftExpiresAt) return;
    const tick = () => {
      const now = Date.now();
      const end = new Date(draftExpiresAt).getTime();
      const diff = end - now;
      if (diff <= 0) { setCountdown('منقضی شد — ممکن است هر لحظه حذف شود.'); return; }
      const hrs = Math.floor(diff / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setCountdown(`${hrs}س ${mins}د ${secs}ث`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [draftExpiresAt]);

  const canSaveDraft = useMemo(() => {
    return value.title.trim().length > 0 && value.description.trim().length > 0;
  }, [value.title, value.description]);

  const canSubmit = useMemo(() => {
    return (
      value.title.trim().length > 0 &&
      value.description.trim().length > 0 &&
      value.city.trim().length > 0 &&
      value.date.trim().length > 0 &&
      value.budgetString.trim().length > 0 &&
      value.termsAccepted === true
    );
  }, [value]);

  return (
    <div className="space-y-4">
      {/* وضعیت و انقضای درافت */}
      <div className="flex items-center gap-2 text-sm">
        <span className="px-2 py-0.5 rounded-full border">
          وضعیت: <b className="ml-1">{status}</b>
        </span>
        <span className="px-2 py-0.5 rounded-full border">
          فرم: <b className="ml-1">{modeLabel}</b>
        </span>
        {status === 'draft' && draftExpiresAt && (
          <span className="px-2 py-0.5 rounded-full border bg-yellow-50">
            ⏳ حذف درافت: <b className="ml-1">{new Date(draftExpiresAt).toLocaleString()}</b> — باقی‌مانده: <b>{countdown}</b>
          </span>
        )}
      </div>

      {/* فرم */}
      <div className="space-y-3">
        <input
          className="w-full border rounded-lg p-2"
          placeholder="موضوع *"
          value={value.title}
          onChange={(e) => onChange({ title: e.target.value })}
          required
        />

        <textarea
          className="w-full border rounded-lg p-2 min-h-[120px]"
          placeholder="توضیح *"
          value={value.description}
          onChange={(e) => onChange({ description: e.target.value })}
          required
        />

        <div className="grid md:grid-cols-3 gap-4">
          <input
            className="w-full border rounded-lg p-2"
            placeholder="مبلغ (آفیش) *"
            value={value.budgetString}
            onChange={(e) => onChange({ budgetString: e.target.value })}
          />
          <input
            className="w-full border rounded-lg p-2"
            placeholder="لوکیشن (شهر) *"
            value={value.city}
            onChange={(e) => onChange({ city: e.target.value })}
          />
          <input
            className="w-full border rounded-lg p-2"
            type="date"
            value={value.date}
            onChange={(e) => onChange({ date: e.target.value })}
          />
        </div>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={value.termsAccepted}
            onChange={(e) => onChange({ termsAccepted: e.target.checked })}
          />
          <span>
            شرایط و قوانین را می‌پذیرم
            <a href="/terms" target="_blank" className="text-blue-600 mx-1 underline">مطالعه قوانین</a>
          </span>
        </label>
      </div>

      {/* دکمه‌ها */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onSaveDraft}
          disabled={!canSaveDraft || savingDraft}
          className="px-4 py-2 rounded-lg bg-gray-800 text-white disabled:bg-gray-300"
        >
          {savingDraft ? 'در حال ذخیره…' : 'ذخیره پیش‌نویس'}
        </button>

        <button
          type="button"
          onClick={onSubmitForReview}
          disabled={!canSubmit || submitting}
          className="px-4 py-2 rounded-lg bg-emerald-600 text-white disabled:bg-gray-300"
        >
          {submitting ? 'در حال ارسال…' : 'ارسال برای بررسی'}
        </button>
      </div>

      {message && <div className="text-green-600 text-sm">{message}</div>}
      {error && <div className="text-red-600 text-sm">{error}</div>}
    </div>
  );
}
