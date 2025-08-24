"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchNotifications, readNotification, deleteNotification } from "@/lib/api/notifications";

export default function NotificationsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => fetchNotifications({ limit: 100 }),
    refetchInterval: 20_000,
  });

  const markRead = useMutation({
    mutationFn: (id: string) => readNotification(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteNotification(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  if (isLoading) return <div>در حال دریافت نوتیفیکیشن‌ها…</div>;
  const items = data?.items ?? data ?? [];

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <h1 className="text-xl font-bold">نوتیفیکیشن‌ها</h1>
      <div className="space-y-2">
        {items.length === 0 && <div>چیزی ندارید.</div>}
        {items.map((n: any) => (
          <div key={n.id} className="border rounded-xl p-3 flex items-center justify-between">
            <div>
              <div className="font-medium">{n.title ?? "اعلان"}</div>
              <div className="text-sm text-gray-600">{n.body ?? "—"}</div>
            </div>
            <div className="flex items-center gap-2">
              {!n.read && (
                <button className="text-xs border rounded px-2 py-1" onClick={() => markRead.mutate(n.id)}>
                  خواندم
                </button>
              )}
              <button className="text-xs border rounded px-2 py-1" onClick={() => remove.mutate(n.id)}>
                حذف
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
