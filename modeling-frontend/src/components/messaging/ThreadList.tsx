"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { fetchThreads } from "@/lib/api/threads";

export default function ThreadList() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["threads"],
    queryFn: () => fetchThreads(),
    refetchInterval: 15_000, // fallback polling
  });

  if (isLoading) return <div>در حال بارگذاری گفتگوها…</div>;
  if (isError) return <div>خطا در دریافت گفتگوها</div>;

  const items = data?.items ?? data ?? [];
  return (
    <div className="space-y-2">
      {items.length === 0 && <div>گفتگویی ندارید.</div>}
      {items.map((t: any) => (
        <Link
          key={t.id}
          href={`/inbox/${t.id}`}
          className="block rounded-xl p-4 border hover:bg-gray-50"
        >
          <div className="flex items-center justify-between">
            <div className="font-medium">{t.title ?? t.jobTitle ?? "بدون عنوان"}</div>
            {t.unreadCount > 0 && (
              <span className="text-xs rounded-full px-2 py-0.5 bg-black text-white">
                {t.unreadCount}
              </span>
            )}
          </div>
          <div className="text-sm text-gray-500 line-clamp-1">
            {t.lastMessage?.text ?? "—"}
          </div>
        </Link>
      ))}
    </div>
  );
}
