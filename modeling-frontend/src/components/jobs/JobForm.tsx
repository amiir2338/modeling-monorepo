'use client';

import React, { useMemo } from 'react';

export type JobStatus = 'draft' | 'pending_review' | 'approved' | 'rejected';

export type JobFormValue = {
  title: string;
  description: string;
  budgetString: string;
  city: string;
  date: string; // yyyy-mm-dd
  termsAccepted: boolean;
};

type Props = {
  mode?: 'create' | 'edit';
  value: JobFormValue;
  status: JobStatus;
  draftExpiresAt?: string | null;

  savingDraft?: boolean;
  submitting?: boolean;

  error?: string | null;
  message?: string | null;

  onChange: (patch: Partial<JobFormValue>) => void;
  onSaveDraft?: () => void;
  onSubmitForReview?: () => void;
  onUpdateAndResend?: () => void; // اگر در صفحه ویرایش لازم شد
};

function StatusBadge({ status }: { status: JobStatus }) {
  const cls =
    status === 'approved'
      ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
      : status === 'rejected'
      ? 'bg-rose-100 text-rose-700 border-rose-200'
      : status === 'pending_review'
      ? 'bg-amber-100 text-amber-700 border-amber-200'
      : 'bg-slate-100 text-slate-700 border-slate-200';

  const label =
    status === 'approved'
      ? 'تایید شده'
      : status === 'rejected'
      ? 'رد شده'
      : status === 'pending_review'
      ? 'در انتظار بررسی'
      : 'پیش‌نویس';

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs ${cls}`}>
      <span className="size-2 rounded-full bg-current/50" />
      {label}
    </span>
  );
}

export default function JobForm(props: Props) {
  const {
    mode = 'create',
    value,
    status,
    draftExpiresAt = null,
    savingDraft = false,
    submitting = false,
    error = null,
    message = null,
    onChange,
    onSaveDraft,
    onSubmitForReview,
    onUpdateAndResend,
  } = props;

  const isCreate = mode === 'create';
  const busy = savingDraft || submitting;

  const titleText = isCreate ? 'ثبت آگهی مدلینگ' : 'ویرایش آگهی مدلینگ';
  const subtitleText = isCreate ? 'فرم: ایجاد' : 'فرم: ویرایش';

  const draftCountdown = useMemo(() => {
    if (!draftExpiresAt) return null;
    const dt = new Date(draftExpiresAt);
    if (Number.isNaN(dt.getTime())) return null;
    return new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(dt);
  }, [draftExpiresAt]);

  return (
    <section className="relative">
      {/* هدر/هیرو کوچک کارت-شیشه‌ای */}
      <div className="mb-6 rounded-2xl border border-slate-200/60 bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:border-slate-700/40 dark:bg-black/30">
        <div className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold bg-clip-text text-transparent"
                  style={{ backgroundImage: 'linear-gradient(135deg,#7c3aed,#06b6d4)' }}>
                {titleText} ✨
              </h1>
              <p className="mt-1 text-sm text-slate-500">{subtitleText}</p>
            </div>
            <StatusBadge status={status} />
          </div>

          {draftCountdown && (
            <div className="mt-3 text-xs text-slate-600 dark:text-slate-300">
              ⏳ انقضای پیش‌نویس: <span className="font-semibold">{draftCountdown}</span>
            </div>
          )}
        </div>
      </div>

      {/* بدنه فرم */}
      <div className="rounded-2xl border border-slate-200/60 bg-white p-5 sm:p-6 shadow-sm dark:border-slate-700/40 dark:bg-black/30">
        <div className="grid grid-cols-1 gap-5">
          {/* عنوان */}
          <div>
            <label className="mb-1 block text-sm text-slate-700 dark:text-slate-200">
              موضوع <span className="text-rose-500">*</span>
            </label>
            <input
              className="w-full rounded-xl border border-slate-300 bg-white/90 px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-900/60 dark:text-slate-100"
              placeholder="مثلاً: نیازمند مدل خانم برای کمپین پاییزی"
              value={value.title}
              onChange={(e) => onChange({ title: e.target.value })}
            />
          </div>

          {/* توضیح */}
          <div>
            <label className="mb-1 block text-sm text-slate-700 dark:text-slate-200">
              توضیح <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={5}
              className="w-full rounded-xl border border-slate-300 bg-white/90 px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-900/60 dark:text-slate-100"
              placeholder="جزئیات پروژه، نیازمندی‌ها، زمان و ..."
              value={value.description}
              onChange={(e) => onChange({ description: e.target.value })}
            />
            <p className="mt-1 text-xs text-slate-500">توضیح شفاف‌تر → پذیرش سریع‌تر ✅</p>
          </div>

          {/* بودجه */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="mb-1 block text-sm text-slate-700 dark:text-slate-200">مبلغ (آفیش)</label>
              <input
                inputMode="numeric"
                className="w-full rounded-xl border border-slate-300 bg-white/90 px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-900/60 dark:text-slate-100"
                placeholder="مثلاً 3,000,000"
                value={value.budgetString}
                onChange={(e) => onChange({ budgetString: e.target.value })}
              />
            </div>

            {/* شهر */}
            <div>
              <label className="mb-1 block text-sm text-slate-700 dark:text-slate-200">
                لوکیشن (شهر) <span className="text-rose-500">{isCreate ? '' : ''}</span>
              </label>
              <input
                className="w-full rounded-xl border border-slate-300 bg-white/90 px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-900/60 dark:text-slate-100"
                placeholder="مثلاً تهران"
                value={value.city}
                onChange={(e) => onChange({ city: e.target.value })}
              />
            </div>

            {/* تاریخ */}
            <div>
              <label className="mb-1 block text-sm text-slate-700 dark:text-slate-200">
                تاریخ برگزاری/شروع
              </label>
              <input
                type="date"
                className="w-full rounded-xl border border-slate-300 bg-white/90 px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-900/60 dark:text-slate-100"
                value={value.date}
                onChange={(e) => onChange({ date: e.target.value })}
              />
            </div>
          </div>

          {/* قوانین */}
          <div className="flex items-start gap-2 rounded-xl border border-slate-200/70 p-3 dark:border-slate-700/40">
            <input
              id="terms"
              type="checkbox"
              className="mt-1 size-4 accent-indigo-600"
              checked={value.termsAccepted}
              onChange={(e) => onChange({ termsAccepted: e.target.checked })}
            />
            <label htmlFor="terms" className="text-sm">
              <span className="font-medium">شرایط و قوانین</span> را می‌پذیرم و مطالعه کردم.
            </label>
          </div>

          {/* پیام‌ها */}
          {(error || message) && (
            <div
              className={`rounded-xl border p-3 text-sm ${
                error
                  ? 'border-rose-200 bg-rose-50 text-rose-700'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-700'
              }`}
            >
              {error ?? message}
            </div>
          )}

          {/* دکمه‌ها */}
          <div className="mt-2 flex flex-wrap items-center gap-3">
            {isCreate && typeof onSaveDraft === 'function' && (
              <button
                type="button"
                disabled={busy}
                onClick={onSaveDraft}
                className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                ذخیره پیش‌نویس
              </button>
            )}

            {typeof onSubmitForReview === 'function' && (
              <button
                type="button"
                disabled={busy}
                onClick={onSubmitForReview}
                className="inline-flex items-center justify-center rounded-full px-5 py-2 text-sm font-semibold text-white transition shadow-lg disabled:opacity-50"
                style={{ backgroundImage: 'linear-gradient(135deg,#7c3aed,#06b6d4)' }}
                title={isCreate ? 'ارسال برای بررسی' : 'ارسال/به‌روزرسانی برای بررسی'}
              >
                {isCreate ? 'ارسال برای بررسی' : 'به‌روزرسانی و ارسال'}
              </button>
            )}

            {mode === 'edit' && typeof onUpdateAndResend === 'function' && (
              <button
                type="button"
                disabled={busy}
                onClick={onUpdateAndResend}
                className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                ذخیره تغییرات
              </button>
            )}

            {busy && <span className="text-xs text-slate-500">در حال انجام…</span>}
          </div>
        </div>
      </div>
    </section>
  );
}
