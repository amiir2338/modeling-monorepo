"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { fetchUnreadCount } from "@/lib/api/threads";

export default function NotificationBell() {
  const { data } = useQuery({
    queryKey: ["inbox-unread-count"],
    queryFn: () => fetchUnreadCount(),
    refetchInterval: 15_000,
  });

  const count = Number(data ?? 0);

  return (
    <Link href="/inbox" className="relative inline-block">
      <span className="material-icons">notifications</span>
      {count > 0 && (
        <span className="absolute -top-1 -right-1 text-[10px] bg-black text-white rounded-full px-1.5">
          {count}
        </span>
      )}
    </Link>
  );
}
