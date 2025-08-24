"use client";
import { useState } from "react";

export default function MessageInput({ onSend }: { onSend: (text: string) => void }) {
  const [text, setText] = useState("");

  return (
    <div className="flex gap-2 p-2 border-t">
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && text.trim()) { onSend(text.trim()); setText(""); } }}
        placeholder="پیام خود را بنویسید…"
        className="flex-1 rounded-xl border px-3 py-2 outline-none"
      />
      <button
        onClick={() => { if (text.trim()) { onSend(text.trim()); setText(""); } }}
        className="rounded-xl px-4 py-2 border"
      >
        ارسال
      </button>
    </div>
  );
}
