'use client';

import { useEffect, useState } from 'react';
import {
  listNotifications,
  markNotificationRead,
  deleteNotification,
  type NotificationDTO,
} from '@/lib/api/notifications';

export default function NotificationsPage() {
  const [items, setItems] = useState<NotificationDTO[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await listNotifications({ page: 1, limit: 20 });
      setItems(res.data);
    } catch (e) {
      const msg = (e as Error).message ?? 'خطا در دریافت اعلان‌ها';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const onRead = async (id: string) => {
    try {
      await markNotificationRead(id);
      setItems(prev =>
        prev.map(n => (n._id === id ? { ...n, read: true } : n)),
      );
    } catch (e) {
      alert((e as Error).message ?? 'خطا در خوانده‌شدن اعلان');
    }
  };

  const onDelete = async (id: string) => {
    try {
      await deleteNotification(id);
      setItems(prev => prev.filter(n => n._id !== id));
    } catch (e) {
      alert((e as Error).message ?? 'خطا در حذف اعلان');
    }
  };

  return (
    <main className="max-w-3xl mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-bold">اعلان‌ها</h1>

      {loading && <p>در حال بارگیری…</p>}
      {error && <p className="text-red-600">{error}</p>}
      {!loading && items.length === 0 && <p>اعلان جدیدی وجود ندارد.</p>}

      <ul className="divide-y">
        {items.map(n => (
          <li key={n._id} className="py-3 flex items-start justify-between gap-3">
            <div>
              <p className="font-medium">{n.type}</p>
              <p className="text-gray-700">{n.message}</p>
              <p className="text-xs text-gray-500">{new Date(n.createdAt).toLocaleString('fa-IR')}</p>
            </div>
            <div className="flex items-center gap-2">
              {!n.read && (
                <button
                  onClick={() => onRead(n._id)}
                  className="px-3 py-1 rounded bg-violet-600 text-white text-sm"
                >
                  خوانده شد
                </button>
              )}
              <button
                onClick={() => onDelete(n._id)}
                className="px-3 py-1 rounded border text-sm"
              >
                حذف
              </button>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}

