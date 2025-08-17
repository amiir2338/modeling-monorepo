'use client';

import React, { useMemo } from 'react';

/* ELI5: تایپ‌ها فقط به ادیتور/TS کمک می‌کنند بداند فرم چه فیلدهایی دارد */
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

/* ✅ پولیش بج وضعیت (کپسولی، فونت بولد، نقطه 6px) */
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
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 h-6 text-[12px] font-bold leading-none ${cls}`}
    >
      {/* ELI5: چراغ وضعیت 6×6 که با رنگ متن ست می‌شود */}
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

  /* ✅ تیتر و زیرتیتر بهتر */
  const titleText = isCreate ? 'ثبت آگهی مدلینگ' : 'ویرایش آگهی مدلینگ';
  const subtitleText = isCreate
    ? 'فرم ایجاد آگهی — اطلاعات کامل‌تر = بررسی سریع‌تر'
    : 'فرم ویرایش آگهی — پس از اصلاح، دوباره برای بررسی ارسال می‌شود';

  /* ELI5: اگر سرور زمان انقضای درافت را بدهد، آن را خوانا می‌کنیم */
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
    // کل فرم داخل کارت (استایل کارت در job-card.css لود می‌شود از layout)
    <section className="job-card">
      {/* ✅ هدر کارت وسط‌چین: تیتر وسط، زیرتیتر واضح، و بج زیر آن */}
      <div className="job-card__header job-card__header--center">
        <div className="job-card__header-title job-card__header-title--center">
          <h1 className="job-card__title">{titleText} ✨</h1>
          <p className="job-card__subtitle">{subtitleText}</p>
        </div>

        {/* بج وضعیت زیر تیتر و وسط */}
        <div className="job-card__badges">
          <StatusBadge status={status} />
        </div>
      </div>

      {draftCountdown && (
        <div className="job-card__meta job-card__meta--center">
          ⏳ انقضای پیش‌نویس: <span className="font-semibold">{draftCountdown}</span>
        </div>
      )}

      <hr className="job-card__divider" />

      {/* بدنه کارت با فاصله‌گذاری منظم */}
      <div className="job-card__body">
        {/* عنوان */}
        <div className="job-field">
          <label className="job-label">
            موضوع <span className="text-rose-500">*</span>
          </label>
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
          <div className={`job-alert ${error ? 'job-alert--error' : 'job-alert--ok'}`}>
            {error ?? message}
          </div>
        )}

        {/* اکشن‌ها */}
        <div className="job-actions">
          {isCreate && typeof onSaveDraft === 'function' && (
            <button type="button" disabled={busy} onClick={onSaveDraft} className="btn btn-soft">
              ذخیره پیش‌نویس
            </button>
          )}

          {typeof onSubmitForReview === 'function' && (
            <button
              type="button"
              disabled={busy}
              onClick={onSubmitForReview}
              className="btn btn-cta"
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
