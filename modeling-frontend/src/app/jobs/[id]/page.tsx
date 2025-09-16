'use client';

import { useEffect, useState } from 'react';
import { isAxiosError } from 'axios';
import { useParams, useRouter } from 'next/navigation';
import http from '@/lib/api/http';

/* 🟢 خیلی ساده بگم (ELI5):
   - این صفحه آگهی را با GET از /api/v1/jobs/:id می‌گیرد.
   - اگر آگهی approved بود، فرم اپلای نشان می‌دهیم.
   - ارسال اپلای با POST /api/v1/jobs/:id/apply انجام می‌شود.
   - چون احراز هویت با «کوکی HttpOnly» است، باید withCredentials=true باشد. */

type JobStatus = 'draft' | 'pending_review' | 'approved' | string;

interface Job {
  _id: string;
  title: string;
  description?: string | null;
  budget?: number | null;
  city?: string | null;
  date?: string | null;
  status?: JobStatus;
  [k: string]: unknown;
}

/* 🟢 بعضی بک‌اندها مستقیم Job می‌دهند، بعضی داخل شئ دیگری:
   هر دو را پشتیبانی می‌کنیم تا خطا نخوریم. */
type JobSingleResponse = Job | { ok?: boolean; job: Job };

interface ApplyResponse {
  ok: boolean;
  message?: string;
  [k: string]: unknown;
}

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  // 🟢 stateهای صفحه
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [err, setErr] = useState<string>('');

  // 🟢 stateهای فرم اپلای
  const [message, setMessage] = useState<string>('');
  const [portfolio, setPortfolio] = useState<string>('');
  const [applyMsg, setApplyMsg] = useState<string>('');
  const [applyBusy, setApplyBusy] = useState<boolean>(false);

  // 🟢 گرفتن آگهی
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setErr('');
      try {
        // نکته مهم: پیشوند /api
        const res = await http.get<JobSingleResponse>(`/api/v1/jobs/${id}`, {
          withCredentials: true, // کوکی HttpOnly همراه درخواست
        });

        const data: Job =
          typeof res.data === 'object' && res.data !== null && 'job' in res.data
            ? (res.data as { job: Job }).job
            : (res.data as Job);

        if (mounted) setJob(data);
      } catch (e: unknown) {
        let msg = 'خطا در دریافت آگهی';
        if (isAxiosError(e)) {
          const fromServer =
            (e.response?.data as { message?: string } | undefined)?.message;
          msg = fromServer || e.message || msg;
        } else if (e instanceof Error) {
          msg = e.message || msg;
        }
        if (mounted) setErr(msg);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [id]);

  // 🟢 ارسال درخواست همکاری (اپلای)
  const apply = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setApplyMsg('');
    setApplyBusy(true);
    try {
      const res = await http.post<ApplyResponse>(
        `/api/v1/jobs/${id}/apply`,
        { message, portfolio },
        { withCredentials: true } // کوکی HttpOnly
      );

      if (res.data?.ok) {
        setApplyMsg('درخواست شما ثبت شد ✅');
      } else {
        setApplyMsg(res.data?.message ?? 'درخواست ثبت نشد');
      }
    } catch (e: unknown) {
      let msg = 'ارسال درخواست ناموفق بود';
      if (isAxiosError(e)) {
        const fromServer =
          (e.response?.data as { message?: string } | undefined)?.message;
        msg = fromServer || e.message || msg;
      } else if (e instanceof Error) {
        msg = e.message || msg;
      }
      setApplyMsg(msg);
    } finally {
      setApplyBusy(false);
    }
  };

  // 🟢 وضعیت‌های مختلف UI
  if (loading) return <p className="p-4">در حال بارگذاری…</p>;
  if (err) return <p className="p-4 text-red-600">{err}</p>;
  if (!job) return <p className="p-4">یافت نشد.</p>;

  return (
    <main className="max-w-3xl mx-auto p-4 grid gap-6">
      {/* برگشت */}
      <button
        onClick={() => router.back()}
        className="text-sm opacity-70 hover:opacity-100"
        type="button"
      >
        ← برگشت
      </button>

      {/* عنوان و خلاصه */}
      <header>
        <h1 className="text-2xl font-bold">{job.title}</h1>
        <div className="text-sm opacity-70 mt-1">
          {job.city || '—'} •{' '}
          {job.budget ? `بودجه ${job.budget}` : 'بدون بودجه'} • وضعیت: {job.status || '—'}
        </div>
      </header>

      {/* توضیحات */}
      <article className="prose max-w-none">
        <p>{job.description || '—'}</p>
      </article>

      {/* فرم اپلای (فقط وقتی آگهی approved است) */}
      {job.status !== 'approved' ? (
        <div className="p-3 rounded bg-yellow-50 border">
          این آگهی هنوز برای اپلای باز نیست.
        </div>
      ) : (
        <form onSubmit={apply} className="grid gap-3 border rounded-xl p-4">
          <h3 className="font-semibold">درخواست همکاری (Model)</h3>

          <input
            className="border p-2 rounded"
            placeholder="لینک نمونه‌کار (اختیاری)"
            value={portfolio}
            onChange={(e) => setPortfolio(e.target.value)}
          />

          <textarea
            className="border p-2 rounded"
            placeholder="پیام شما"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />

          <button
            data-testid="apply"
            aria-label="apply-button"
            disabled={applyBusy}
            className="bg-black text-white rounded-lg px-4 py-2 disabled:opacity-50"
          >
            {applyBusy ? 'در حال ارسال…' : 'ارسال درخواست'}
          </button>

          {applyMsg && (
            <p
              className="text-sm mt-1"
              style={{ color: applyMsg.includes('✅') ? 'green' : 'crimson' }}
            >
              {applyMsg}
            </p>
          )}
        </form>
      )}
    </main>
  );
}
