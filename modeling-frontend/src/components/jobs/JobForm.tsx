'use client';

import React, { useMemo } from 'react';

export type JobStatus = 'draft' | 'pending_review' | 'approved' | 'rejected';
export type JobFormValue = {
  title: string;
  description: string;
  budgetString: string;
  city: string;
  date: string;           // yyyy-mm-dd
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
  onUpdateAndResend?: () => void;
};

/* ELI5: بج وضعیت — این نسخه هم با کلاس‌های Tailwind کار می‌کند هم با CSS اختصاصی (job-card.css) */
function StatusBadge({ status }: { status: JobStatus }) {
  const base =
    'inline-flex items-center gap-1.5 h-8 px-3.5 rounded-full border text-[13px] font-extrabold leading-none shadow-sm';
  const palette =
    status === 'approved'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : status === 'rejected'
      ? 'bg-rose-50 text-rose-700 border-rose-200'
      : status === 'pending_review'
      ? 'bg-amber-50 text-amber-700 border-amber-200'
      : 'bg-slate-50 text-slate-700 border-slate-200';

  const label =
    status === 'approved' ? 'تایید شده'
    : status === 'rejected' ? 'رد شده'
    : status === 'pending_review' ? 'در انتظار بررسی'
    : 'پیش‌نویس';

  return (
    <span className={`status-chip ${base} ${palette}`}>
      {/* ELI5: اگر job-card.css لود شود، کلاس status-chip ظاهر را حرفه‌ای‌تر می‌کند */}
      <span className="w-1.5 h-1.5 rounded-full bg-current/60" />
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

  /* عنوان‌ها: «ثبت فراخوان» / «ویرایش فراخوان» */
  const titleText = isCreate ? 'ثبت فراخوان' : 'ویرایش فراخوان';

  /* شمارش معکوس انقضای پیش‌نویس (اختیاری) */
  const draftCountdown = useMemo(() => {
    if (!draftExpiresAt) return null;
    const dt = new Date(draftExpiresAt);
    if (Number.isNaN(dt.getTime())) return null;
    return new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    }).format(dt);
  }, [draftExpiresAt]);

  return (
    // ✅ نکته‌ی مهم: کلاس‌های job-card* را برگرداندیم تا CSS اختصاصی اثر کند.
    <section className="job-card rounded-2xl border border-slate-200 bg-white shadow-[0_8px_28px_rgba(15,23,42,.06)] overflow-hidden">
      {/* هدر وسط‌چین */}
      <div
        className="job-card__header flex flex-col items-center justify-center gap-2 p-4 sm:p-5"
        style={{
          // ELI5: این بک‌گراند گرادیانی fallback است؛ اگر CSS لود شود، همین کلاس job-card__header استایل بهتر می‌دهد
          backgroundImage:
            'linear-gradient(135deg, color-mix(in srgb, var(--brand-1) 10%, #ffffff), color-mix(in srgb, var(--brand-2) 10%, #ffffff))',
        }}
      >
        {/* تیتر گرادیانی */}
        <h1
          className="job-card__title text-center font-extrabold bg-clip-text text-transparent"
          style={{
            // ELI5: اگر job-card.css لود شود، همین کلاس رنگ و اندازه را مدیریت می‌کند؛ این هم fallback است
            backgroundImage: 'linear-gradient(135deg, var(--brand-1), var(--brand-2))',
            fontSize: '1.6rem',
            lineHeight: 1.4,
          }}
        >
          {titleText} ✨
        </h1>

        {/* بج وضعیت زیر عنوان */}
        <div className="job-card__badges">
          <StatusBadge status={status} />
        </div>
      </div>

      {/* متادیتا (انقضای پیش‌نویس) وسط‌چین */}
      {draftCountdown && (
        <div className="job-card__meta job-card__meta--center text-center text-[13px] text-slate-600 pb-2">
          ⏳ انقضای پیش‌نویس: <b>{draftCountdown}</b>
        </div>
      )}

      {/* جداکننده روشن */}
      <hr className="job-card__divider h-px border-0" style={{ background: 'linear-gradient(90deg, transparent, #e5e7eb, transparent)' }} />

      {/* بدنه کارت */}
      <div className="job-card__body p-5 sm:p-6">
        {/* عنوان */}
        <div className="job-field flex flex-col gap-1.5 mb-4">
          <label className="job-label text-sm text-slate-800">
            موضوع <span className="text-rose-500">*</span>
          </label>
          <input
            className="job-input w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-indigo-200"
            placeholder="مثلاً: نیازمند مدل برای کمپین پاییزی"
            value={value.title}
            onChange={(e) => onChange({ title: e.target.value })}
          />
        </div>

        {/* توضیح */}
        <div className="job-field flex flex-col gap-1.5 mb-4">
          <label className="job-label text-sm text-slate-800">
            توضیح <span className="text-rose-500">*</span>
          </label>
          <textarea
            rows={5}
            className="job-input w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-indigo-200"
            placeholder="جزئیات پروژه، نیازمندی‌ها، زمان و ..."
            value={value.description}
            onChange={(e) => onChange({ description: e.target.value })}
          />
          <p className="job-hint text-xs text-slate-500">توضیح شفاف‌تر → پذیرش سریع‌تر ✅</p>
        </div>

        {/* مبلغ/شهر/تاریخ */}
        <div className="job-grid grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div className="job-field flex flex-col gap-1.5">
            <label className="job-label text-sm text-slate-800">مبلغ (آفیش)</label>
            <input
              inputMode="numeric"
              className="job-input w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-indigo-200"
              placeholder="مثلاً 3,000,000"
              value={value.budgetString}
              onChange={(e) => onChange({ budgetString: e.target.value })}
            />
          </div>

          <div className="job-field flex flex-col gap-1.5">
            <label className="job-label text-sm text-slate-800">لوکیشن (شهر)</label>
            <input
              className="job-input w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-indigo-200"
              placeholder="مثلاً تهران"
              value={value.city}
              onChange={(e) => onChange({ city: e.target.value })}
            />
          </div>

          <div className="job-field flex flex-col gap-1.5">
            <label className="job-label text-sm text-slate-800">تاریخ برگزاری/شروع</label>
            <input
              type="date"
              className="job-input w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-indigo-200"
              value={value.date}
              onChange={(e) => onChange({ date: e.target.value })}
            />
          </div>
        </div>

        {/* قوانین */}
        <div className="job-check flex items-start gap-2 rounded-xl border border-slate-200 p-3 mb-4">
          <input
            id="terms"
            type="checkbox"
            className="job-check__box mt-1 w-4 h-4 accent-indigo-600"
            checked={value.termsAccepted}
            onChange={(e) => onChange({ termsAccepted: e.target.checked })}
          />
          <label htmlFor="terms" className="job-check__label text-sm">
            <span className="font-medium">شرایط و قوانین</span> را می‌پذیرم و مطالعه کردم.
          </label>
        </div>

        {/* پیام موفق/خطا */}
        {(error || message) && (
          <div className={`job-alert rounded-xl border p-3 text-sm ${error ? 'job-alert--error border-rose-200 bg-rose-50 text-rose-700' : 'job-alert--ok border-emerald-200 bg-emerald-50 text-emerald-700'} mb-4`}>
            {error ?? message}
          </div>
        )}

        {/* اکشن‌ها */}
        <div className="job-actions flex flex-wrap items-center gap-3">
          {/* دکمه Outline برند برای «ذخیره پیش‌نویس» */}
          {isCreate && typeof onSaveDraft === 'function' && (
            <button
              type="button"
              disabled={busy}
              onClick={onSaveDraft}
              className="btn btn-outline-brand inline-flex items-center justify-center rounded-full border px-4 py-2 text-sm font-bold bg-white transition hover:bg-slate-50 disabled:opacity-50"
              style={{
                // ELI5: اگر CSS سراسری بار نشود، این fallback همچنان برند را اعمال می‌کند
                color: 'var(--brand-1)',
                borderColor: 'var(--brand-1)',
              }}
            >
              ذخیره پیش‌نویس
            </button>
          )}

          {/* CTA گرادیانی اصلی */}
          {typeof onSubmitForReview === 'function' && (
            <button
              type="button"
              disabled={busy}
              onClick={onSubmitForReview}
              className="btn btn-cta inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-extrabold text-white shadow-lg disabled:opacity-50"
              style={{ backgroundImage: 'linear-gradient(135deg, var(--brand-1), var(--brand-2))' }}
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
              className="btn btn-outline-brand inline-flex items-center justify-center rounded-full border px-4 py-2 text-sm font-bold bg-white transition hover:bg-slate-50 disabled:opacity-50"
              style={{ color: 'var(--brand-1)', borderColor: 'var(--brand-1)' }}
            >
              ذخیره تغییرات
            </button>
          )}

          {busy && <span className="job-busy text-xs text-slate-500">در حال انجام…</span>}
        </div>
      </div>
    </section>
  );
}
