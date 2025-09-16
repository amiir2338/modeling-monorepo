// src/components/messaging/ChatWindow.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import {
  listMessages,
  sendMessage,
  type Paginated,
  type MessageDTO,
} from "@/lib/api/messages";
import { getSocket } from "@/lib/socket";

type Props = {
  applicationId?: string;
  threadId?: string;
};

// پاسخ لیست پیام‌ها + meId اختیاری اگر بک‌اند برگرداند
type MessagesQuery = Paginated<MessageDTO> & { meId?: string };

export default function ChatWindow({ applicationId, threadId }: Props) {
  const qc = useQueryClient();
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const [text, setText] = useState<string>("");

  // برداشت توکن از localStorage (کلیدهای رایج)
  const token: string =
    (typeof window !== "undefined" &&
      (localStorage.getItem("token") ||
        localStorage.getItem("authToken") ||
        localStorage.getItem("access_token"))) ||
    "";

  // دریافت پیام‌ها
  const { data, isLoading, isError, refetch } = useQuery<MessagesQuery>({
    queryKey: ["messages", { applicationId, threadId }],
    enabled: Boolean(applicationId || threadId),
    queryFn: async () => {
      const res = await listMessages({
        applicationId,
        threadId,
        page: 1,
        limit: 50,
        token,
      });
      return res as MessagesQuery;
    },
  });

  // ارسال پیام
  const sendMutation = useMutation({
    mutationFn: async (): Promise<void> => {
      const value = text.trim();
      if (!value) return;
      await sendMessage(
        {
          applicationId,
          threadId,
          text: value,
        },
        token
      );
    },
    onSuccess: async () => {
      setText("");
      await qc.invalidateQueries({
        queryKey: ["messages", { applicationId, threadId }],
      });
      scrollToBottom();
    },
  });

  function scrollToBottom(): void {
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    });
  }

  // Socket: روی پیام جدید رفرش می‌کنیم (با گارد null)
  useEffect(() => {
    if (!token) return;
    const socket = getSocket(token);
    if (!socket) return;

    const handler = (payload: { threadId?: string } | undefined): void => {
      if (payload?.threadId && threadId && payload.threadId !== threadId) return;
      refetch();
    };

    socket.on("message:new", handler);
    return () => {
      socket.off("message:new", handler);
    };
  }, [token, threadId, refetch]);

  useEffect(() => {
    scrollToBottom();
  }, [data?.items?.length]);

  const meId: string | undefined = data?.meId;

  return (
    <div className="flex flex-col h-full border rounded-2xl overflow-hidden">
      <div className="px-4 py-3 border-b bg-slate-50 dark:bg-slate-900 flex items-center justify-between">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100">پیام‌ها</h3>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-white dark:bg-slate-800">
        {isLoading && <div className="text-slate-500">در حال بارگذاری…</div>}
        {isError && <div className="text-red-600">خطا در دریافت پیام‌ها</div>}

        {(data?.items ?? []).map((m) => {
          const isMine: boolean = meId ? m.senderId === meId : (m as unknown as { isMine?: boolean }).isMine === true;
          return (
            <div
              key={m._id}
              className={`max-w-[75%] p-3 rounded-xl ${
                isMine
                  ? "ml-auto bg-indigo-600 text-white"
                  : "mr-auto bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-100"
              }`}
            >
              <div className="whitespace-pre-wrap break-words">{m.text}</div>
              <div className="text-xs opacity-80 mt-1">
                {new Date(m.createdAt).toLocaleString()}
              </div>
            </div>
          );
        })}

        <div ref={bottomRef} />
      </div>

      <form
        className="p-3 border-t bg-slate-50 dark:bg-slate-900 flex gap-2"
        onSubmit={(e: React.FormEvent<HTMLFormElement>) => {
          e.preventDefault();
          sendMutation.mutate();
        }}
      >
        <input
          value={text}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setText(e.target.value)}
          placeholder="متن پیام…"
          className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          type="submit"
          disabled={sendMutation.isPending || !text.trim()}
          className="rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white px-4 py-2"
        >
          ارسال
        </button>
      </form>
    </div>
  );
}

