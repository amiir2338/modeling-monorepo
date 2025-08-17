'use client';

import React, { useMemo } from 'react';

/* ELI5: این تایپ‌ها فقط به ادیتور و TS کمک می‌کنند بداند فرم چه فیلدهایی دارد */
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

/* ELI5: بج وضعیت با رنگ‌های متفاوت؛ مثل برچسب‌های کارت مرجع */
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
    status === 'approved' ? 'تایید شده'
    : status === 'rejected' ? 'رد شده'
    : status === 'pending_review' ? 'در انتظار بررسی'
    : 'پیش‌نویس';

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs ${cls}`}>
      {/* ELI5: این نقطه‌ی کوچک فقط چراغ وضعیت است */}
      <span className="w-2 h-2 rounded-full bg-current/50" />
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

  /* ELI5: اگر سرور زمان انقضای درافت را بدهد، این را به تاریخ خوانا تبدیل می‌کنیم */
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
    // ELI5: کل فرم داخل یک «کارت» با گوشه‌های گرد، سایه‌ی لطیف و مرز ملایم
    <section className="job-card">
      {/* هدر کارت با پس‌زمینه‌ی شیشه‌ای و تیتر گرادیانی بر اساس رنگ برند */}
      <div className="job-card__header">
        <div className="job-card__header-title">
          <h1 className="job-card__title">
            {titleText} ✨
          </h1>
          <p className="job-card__subtitle">{subtitleText}</p>
        </div>
        <StatusBadge status={status} />
      </div>

      {draftCountdown && (
        <div className="job-card__meta">
          ⏳ انقضای پیش‌نویس: <span className="font-semibold">{draftCountdown}</span>
        </div>
      )}

      {/* خط جداکنندهٔ خیلی روشن مثل کارت مرجع */}
      <hr className="job-card__divider" />

      {/* بدنه‌ی کارت: فیلدها با spacing منظم 12/16px */}
      <div className="job-card__body">
        {/* عنوان */}
        <div className="job-field">
          <label className="job-label">
            موضوع <span className="text-rose-500">*</span>
          </label>
          {/* ELI5: از کلاس‌های input خودت + پدینگ و فوکوس نرم استفاده شده */}
          <input
            className="input job-input"
            placeholder="مثلاً: نیازمند مدل خانم برای کمپین پاییزی"
            value={value.title}
            onChange={(e) => onChange({ title: e.target.value })}
          />
        </div>

        {/* توضیح */}
        <div className="job-field">
          <label className="job-label">
            توضیح <span className="text-rose-500">*</span>
          </label>
          <textarea
            rows={5}
            className="textarea job-input"
            placeholder="جزئیات پروژه، نیازمندی‌ها، زمان و ..."
            value={value.description}
            onChange={(e) => onChange({ description: e.target.value })}
          />
          <p className="job-hint">توضیح شفاف‌تر → پذیرش سریع‌تر ✅</p>
        </div>

        {/* مبلغ/شهر/تاریخ */}
        <div className="job-grid">
          <div className="job-field">
            <label className="job-label">مبلغ (آفیش)</label>
            <input
              inputMode="numeric"
              className="input job-input"
              placeholder="مثلاً 3,000,000"
              value={value.budgetString}
              onChange={(e) => onChange({ budgetString: e.target.value })}
            />
          </div>

          <div className="job-field">
            <label className="job-label">لوکیشن (شهر)</label>
            <input
              className="input job-input"
              placeholder="مثلاً تهران"
              value={value.city}
              onChange={(e) => onChange({ city: e.target.value })}
            />
          </div>

          <div className="job-field">
            <label className="job-label">تاریخ برگزاری/شروع</label>
            <input
              type="date"
              className="input job-input"
              value={value.date}
              onChange={(e) => onChange({ date: e.target.value })}
            />
          </div>
        </div>

        {/* قوانین */}
        <div className="job-check">
          <input
            id="terms"
            type="checkbox"
            className="job-check__box"
            checked={value.termsAccepted}
            onChange={(e) => onChange({ termsAccepted: e.target.checked })}
          />
          <label htmlFor="terms" className="job-check__label">
            <span className="font-medium">شرایط و قوانین</span> را می‌پذیرم و مطالعه کردم.
          </label>
        </div>

        {/* پیام موفق/خطا */}
        {(error || message) && (
          <div
            className={`job-alert ${error ? 'job-alert--error' : 'job-alert--ok'}`}
          >
            {error ?? message}
          </div>
        )}

        {/* دکمه‌ها: یکی نرم (پیش‌نویس) و یکی CTA «گوشتالو» مطابق برند */}
        <div className="job-actions">
          {isCreate && typeof onSaveDraft === 'function' && (
            <button
              type="button"
              disabled={busy}
              onClick={onSaveDraft}
              className="btn btn-soft"
            >
              ذخیره پیش‌نویس
            </button>
          )}

          {typeof onSubmitForReview === 'function' && (
            <button
              type="button"
              disabled={busy}
              onClick={onSubmitForReview}
              className="btn btn-cta"
              // ELI5: CTA طبق برند رنگ می‌گیرد؛ حس «قابل‌کلیک و دوستانه»
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
              className="btn btn-soft"
            >
              ذخیره تغییرات
            </button>
          )}

          {busy && <span className="job-busy">در حال انجام…</span>}
        </div>
      </div>
    </section>
  );
}
