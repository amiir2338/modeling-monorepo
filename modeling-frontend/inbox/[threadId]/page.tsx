"use client";
import { useParams } from "next/navigation";
import ChatWindow from "@/components/messaging/ChatWindow";

// اگر توکن را در axios-instance ست می‌کنی، می‌تونی prop token رو حذف کنی.
function useToken() {
  // نمونه ساده؛ با استور پروژه‌ی خودت هم‌راستا کن
  if (typeof window === "undefined") return undefined;
  return localStorage.getItem("token") ?? undefined;
}

export default function ThreadPage() {
  const { threadId } = useParams<{ threadId: string }>();
  const token = useToken();
  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4">
      <h1 className="text-xl font-bold">چت</h1>
      <ChatWindow threadId={threadId} token={token} />
    </div>
  );
}
