"use client";
import { useEffect, useMemo, useRef } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { fetchMessages, sendMessage } from "@/lib/api/messages";
import { markThreadReadAll } from "@/lib/api/threads";
import { getSocket } from "@/lib/socket";

export default function ChatWindow({ threadId, token }: { threadId: string; token?: string }) {
  const qc = useQueryClient();
  const listRef = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["messages", threadId],
    queryFn: () => fetchMessages(threadId),
    refetchInterval: 10_000, // fallback
  });

  const mutation = useMutation({
    mutationFn: (text: string) => sendMessage({ threadId, text }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["messages", threadId] }),
  });

  // Socket realtime
  useEffect(() => {
    const s = getSocket(token);
    if (!s) return;

    const onNewMessage = (payload: any) => {
      if (payload?.threadId === threadId) {
        qc.invalidateQueries({ queryKey: ["messages", threadId] });
      }
    };

    s.on("message:new", onNewMessage); // نام رویداد را با بک‌اند هماهنگ نگه‌دار
    return () => { s.off("message:new", onNewMessage); };
  }, [token, threadId, qc]);

  // Scroll bottom
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [data]);

  const items = useMemo(() => data?.items ?? data ?? [], [data]);

  useEffect(() => {
    // مارک‌کردن به عنوان خوانده
    markThreadReadAll(threadId).catch(() => {});
  }, [threadId]);

  if (isLoading) return <div>در حال بارگذاری پیام‌ها…</div>;

  return (
    <div className="flex flex-col h-[70vh] border rounded-xl overflow-hidden">
      <div ref={listRef} className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-50">
        {items.map((m: any) => (
          <div key={m.id} className={`max-w-[75%] p-2 rounded-xl ${m.isMine ? "bg-black text-white ml-auto" : "bg-white border"}`}>
            <div className="text-sm whitespace-pre-wrap">{m.text}</div>
            <div className="text-[10px] opacity-60 mt-1">{new Date(m.createdAt).toLocaleString()}</div>
          </div>
        ))}
        {items.length === 0 && <div className="text-center text-sm text-gray-500">پیامی وجود ندارد.</div>}
      </div>

      <div>
        <MessageInput onSend={(text) => mutation.mutate(text)} />
      </div>
    </div>
  );
}

function MessageInput({ onSend }: { onSend: (t: string) => void }) {
  const [value, setValue] = React.useState("");
  return (
    <div className="flex gap-2 p-2 border-t bg-white">
      <input
        className="flex-1 rounded-xl border px-3 py-2"
        placeholder="پیام…"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && value.trim()) { onSend(value.trim()); setValue(""); } }}
      />
      <button className="px-4 py-2 border rounded-xl" onClick={() => { if (value.trim()) { onSend(value.trim()); setValue(""); } }}>
        ارسال
      </button>
    </div>
  );
}
