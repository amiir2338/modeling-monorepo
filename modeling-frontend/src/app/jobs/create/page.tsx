'use client';

import { useState } from 'react';
import type { AxiosError } from 'axios';
import http from '@/lib/api/http';

/** 🟢 ELI5: این صفحه فرم «ایجاد آگهی» است.
 *  - مقادیر فرم را در state نگه می‌داریم
 *  - با کلیک «ذخیرهٔ پیش‌نویس»، یک POST به بک‌اند می‌زنیم
 *  - API روی /api/v1/... است و احراز هویت با «کوکی HttpOnly» انجام می‌شود
 *    (پس باید withCredentials برقرار باشد و بک‌اند کوکی را ست کند) 
 */

type JobCreatePayload = {
  title: string;            // 🟢 عنوان آگهی (بهتر است خالی نباشد)
  description: string;      // 🟢 توضیحات آگهی
  city?: string | null;     // 🟢 شهر (اختیاری)
  date?: string | null;     // 🟢 تاریخ (اختیاری) — فرمت yyyy-mm-dd
  budget?: number | null;   // 🟢 بودجه (اختیاری)
  status?: 'draft';         // 🟢 وضعیت (برای ساخت اولیه: پیشنویس)
};

// 🟢 دو شکل متداولِ پاسخ موفق از API را پوشش می‌دهیم تا با هرکدام سازگار باشیم
type CreateResShapeA = { ok: true; data: { job: { _id: string } } };
type CreateResShapeB = { ok: true; job: { _id: string } };
type CreateResFail   = { ok: false; message?: string };
type CreateResponse  = CreateResShapeA | CreateResShapeB | CreateResFail;

export default function CreateJobPage() {
  // 🟢 مقداردهی اولیه فرم
  const [form, setForm] = useState<JobCreatePayload>({
    title: '',
    description: '',
    city: '',
    date: '',
    budget: null,
    status: 'draft',
  });

  // 🟢 وضعیت‌های UI
  const [saving, setSaving] = useState(false);          // در حال ذخیره؟
  const [msg, setMsg]       = useState<string|null>(null); // پیام موفقیت
  const [err, setErr]       = useState<string|null>(null); // پیام خطا

  // 🟢 کمک‌ کننده برای آپدیت بخشی از فرم
  const onChange = (patch: Partial<JobCreatePayload>) =>
    setForm((f) => ({ ...f, ...patch }));

  // 🟢 استخراج id آگهی از پاسخ (هر دو شکل A/B پشتیبانی می‌شود)
  function extractJobId(res: CreateResponse): string | '' {
    if ((res as CreateResShapeA).ok === true && (res as CreateResShapeA).data?.job?._id) {
      return (res as CreateResShapeA).data.job._id;
    }
    if ((res as CreateResShapeB).ok === true && (res as CreateResShapeB).job?._id) {
      return (res as CreateResShapeB).job._id;
    }
    return '';
  }

  // 🟢 ذخیره به‌عنوان پیش‌نویس
  async function saveDraft() {
    setErr(null);
    setMsg(null);

    // ولیدیشن خیلی ساده سمت کلاینت
    if (!form.title.trim()) {
      setErr('عنوان نباید خالی باشد');
      return;
    }
    if (!form.description.trim()) {
      setErr('توضیحات نباید خالی باشد');
      return;
    }

    setSaving(true);
    try {
      // 🟢 توجه: مسیر درست با پیشوند /api (تا دو بار /api/api نشود)
      const res = await http.post<CreateResponse>('/api/v1/jobs', form, {
        withCredentials: true, // 🟢 برای همراه شدن کوکی HttpOnly در درخواست
      });

      // اگر API به‌صورت صریح خطا برگرداند
      if (res.data && (res.data as { ok?: boolean }).ok === false) {
        setErr((res.data as CreateResFail).message || 'ذخیره انجام نشد');
        return;
      }

      const id = extractJobId(res.data as CreateResponse);
      if (id) {
        setMsg('پیش‌نویس ذخیره شد ✅');
        // 🟢 اگر خواستی کاربر را به صفحه آگهی ببری، می‌توانی اینجا ریدایرکت کنی:
        // router.push(`/jobs/${id}`);
      } else {
        setErr('ذخیره انجام نشد');
      }
    } catch (e) {
      const ax = e as AxiosError<{ message?: string }>;
      setErr(ax.response?.data?.message || ax.message || 'خطا در ذخیره');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="p-4 max-w-2xl mx-auto space-y-3">
      <h1 className="text-lg font-bold">ایجاد فرصت</h1>

      {/* 🟢 عنوان آگهی */}
      <input
        className="border rounded-lg p-2 w-full"
        placeholder="عنوان"
        value={form.title}
        onChange={(e) => onChange({ title: e.target.value })}
      />

      {/* 🟢 توضیحات آگهی */}
      <textarea
        className="border rounded-lg p-2 w-full"
        placeholder="توضیحات"
        value={form.description}
        onChange={(e) => onChange({ description: e.target.value })}
      />

      {/* 🟢 شهر (اختیاری) */}
      <input
        className="border rounded-lg p-2 w-full"
        placeholder="شهر"
        value={form.city ?? ''}
        onChange={(e) => onChange({ city: e.target.value })}
      />

      {/* 🟢 تاریخ (اختیاری) — type=date UX بهتری دارد */}
      <input
        type="date"
        className="border rounded-lg p-2 w-full"
        placeholder="yyyy-mm-dd"
        value={form.date ?? ''}
        onChange={(e) => onChange({ date: e.target.value })}
      />

      {/* 🟢 بودجه (اختیاری) — ورودی عددی با پاکسازی */}
      <input
        type="number"
        className="border rounded-lg p-2 w-full"
        placeholder="بودجه (عدد)"
        value={form.budget ?? ''}
        onChange={(e) => {
          const raw = e.target.value;
          const n = Number(raw);
          onChange({ budget: Number.isFinite(n) ? n : null });
        }}
      />

      <div className="flex gap-2">
        <button
          className="px-3 py-2 rounded-lg bg-black text-white disabled:opacity-50"
          disabled={saving}
          onClick={saveDraft}
        >
          {saving ? 'در حال ذخیره...' : 'ذخیره پیش‌نویس'}
        </button>
      </div>

      {msg && <div className="text-green-600">{msg}</div>}
      {err && <div className="text-red-600">{err}</div>}
    </main>
  );
}
