'use client';

import { useEffect, useState } from 'react';
import { isAxiosError } from 'axios';
import { useRouter } from 'next/navigation';
import http from '@/lib/api/http';

/* 🟢 ELI5: این صفحه پروفایل کاربر لاگین‌شده‌ست.
   - با GET /api/v1/auth/me اطلاعات کاربر رو می‌گیریم (با کوکی HttpOnly)
   - ایمیل/نقش/نام رو نشون می‌دیم
   - دکمهٔ «خروج» → POST /api/v1/auth/logout (کوکی پاک می‌شه)
   - یک دکمهٔ «ذخیره نام» داریم که PATCH /api/v1/users/me می‌زنه (اختیاری).
     اگر این مسیر روی بک‌اندت نباشه، پیام می‌ده که هنوز فعال نشده. */

type Role = 'client' | 'model' | 'admin';

type User = {
  _id: string;
  email: string;
  role: Role;
  name?: string | null;
  avatar?: string | null;
  modelId?: string | null;
  clientId?: string | null;
};

/* 🟢 دو شکل رایج پاسخ me که پشتیبانی می‌کنیم: */
type MeResA = { ok: true; data: { user: User } };
type MeResB = { ok: true; user: User };
type MeFail = { ok: false; message?: string };
type MeResponse = MeResA | MeResB | MeFail;

function extractUser(res: MeResponse): User | null {
  if ((res as MeResA).ok && (res as MeResA).data?.user) return (res as MeResA).data.user;
  if ((res as MeResB).ok && (res as MeResB).user) return (res as MeResB).user;
  return null;
}

export default function ProfilePage() {
  const router = useRouter();

  // 🟢 وضعیت‌ها
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // 🟢 دادهٔ کاربر
  const [user, setUser] = useState<User | null>(null);

  // 🟢 فرم و پیام‌ها
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  // 🟢 گرفتن me
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const r = await http.get<MeResponse>('/api/v1/auth/me', { withCredentials: true });
        if (!alive) return;
        const u = extractUser(r.data);
        if (!u) {
          setErr('نشست شما معتبر نیست، لطفاً دوباره وارد شوید.');
          return;
        }
        setUser(u);
        setName(u.name ?? '');
      } catch (e) {
        let msg = 'خطا در دریافت پروفایل';
        if (isAxiosError(e)) msg = e.response?.data?.message || e.message || msg;
        else if (e instanceof Error) msg = e.message || msg;
        setErr(msg);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // 🟢 خروج
  async function logout() {
    try {
      await http.post('/api/v1/auth/logout', {}, { withCredentials: true });
      router.replace('/auth/login');
    } catch (e) {
      let msg = 'خروج ناموفق بود';
      if (isAxiosError(e)) msg = e.response?.data?.message || e.message || msg;
      else if (e instanceof Error) msg = e.message || msg;
      alert(msg);
    }
  }

  // 🟢 ذخیرهٔ نام (اختیاری)
  async function saveName() {
    setSaveMsg(null);
    setSaving(true);
    try {
      /* 🟢 اگر این مسیر روی بک‌اندت موجود باشه، نام ذخیره می‌شه.
         اگر 404 بود، پیام می‌دیم که «فعلاً فعال نیست». */
      const r = await http.patch<{ ok?: boolean; message?: string; user?: User }>(
        '/api/v1/users/me',
        { name },
        { withCredentials: true }
      );
      if (r.data?.ok) {
        setSaveMsg('نام با موفقیت ذخیره شد ✅');
        if (r.data.user) setUser(r.data.user);
      } else {
        setSaveMsg(r.data?.message || 'ذخیره انجام نشد');
      }
    } catch (e) {
      if (isAxiosError(e) && e.response?.status === 404) {
        setSaveMsg('ویرایش نام هنوز روی سرور فعال نشده است.');
      } else {
        let msg = 'ذخیره نام ناموفق بود';
        if (isAxiosError(e)) msg = e.response?.data?.message || e.message || msg;
        else if (e instanceof Error) msg = e.message || msg;
        setSaveMsg(msg);
      }
    } finally {
      setSaving(false);
    }
  }

  // 🟢 رندر وضعیت‌ها
  if (loading) return <main className="p-4">در حال بارگذاری…</main>;
  if (err) return <main className="p-4 text-red-600">{err}</main>;
  if (!user) return <main className="p-4">اطلاعات یافت نشد.</main>;

  return (
    <main className="max-w-xl mx-auto p-4 grid gap-4">
      <h1 className="text-lg font-bold">پروفایل</h1>

      <section className="grid gap-2 border rounded-xl p-4">
        {/* 🟢 ایمیل و نقش فقط خواندنی‌اند */}
        <div className="text-sm">
          <div className="opacity-60">ایمیل</div>
          <div className="font-mono">{user.email}</div>
        </div>
        <div className="text-sm">
          <div className="opacity-60">نقش</div>
          <div>{user.role}</div>
        </div>

        {/* 🟢 نام قابل ویرایش (اختیاری) */}
        <label className="text-sm">
          <div className="opacity-60 mb-1">نام نمایشی</div>
          <input
            className="border rounded-lg p-2 w-full"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="نام شما"
          />
        </label>

        <div className="flex gap-2">
          <button
            onClick={saveName}
            disabled={saving}
            className="px-3 py-2 rounded-lg bg-black text-white disabled:opacity-50"
          >
            {saving ? 'در حال ذخیره…' : 'ذخیره نام'}
          </button>
          <button
            onClick={logout}
            className="px-3 py-2 rounded-lg border bg-red-50 hover:bg-red-100 text-red-700"
          >
            خروج
          </button>
        </div>

        {saveMsg && (
          <div
            className="text-sm mt-1"
            style={{ color: saveMsg.includes('✅') ? 'green' : 'crimson' }}
          >
            {saveMsg}
          </div>
        )}
      </section>

      {/* 🟢 نمایش شناسه‌های لینک‌شده (در صورت نیاز برای دیباگ) */}
      <section className="grid gap-1 text-xs opacity-70">
        <div>userId: <code>{user._id}</code></div>
        {user.clientId ? <div>clientId: <code>{user.clientId}</code></div> : null}
        {user.modelId ? <div>modelId: <code>{user.modelId}</code></div> : null}
      </section>
    </main>
  );
}
