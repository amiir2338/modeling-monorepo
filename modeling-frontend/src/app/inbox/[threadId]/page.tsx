'use client';

import { useParams } from 'next/navigation';
import ChatWindow from '@/components/messaging/ChatWindow';

type Params = { threadId: string };

export default function ThreadPage() {
  const { threadId } = useParams<Params>(); // استخراج threadId از URL

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4">
      <h1 className="text-xl font-bold">چت</h1>

      {/* کامپوننت ChatWindow برای نمایش جزئیات پیام‌ها */}
      {/* ارسال threadId به ChatWindow برای بارگذاری مکالمه */}
      <ChatWindow threadId={threadId} />
    </div>
  );
}
