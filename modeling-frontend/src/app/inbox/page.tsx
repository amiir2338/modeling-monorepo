'use client';

import Link from 'next/link';

export default function InboxIndex() {
  // اگر لیست گفتگوها را بعداً متصل می‌کنی، فعلاً یک پیام ساده نشان بدهیم
  return (
    <main className="max-w-3xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">صندوق پیام‌ها</h1>
      <p className="text-gray-600">یک گفت‌وگو را از لیست سمت چپ/بالا انتخاب کنید.</p>
      <p className="mt-4">
        برای تست سریع می‌توانید به یک آدرس مانند{' '}
        <Link href="/inbox/TEST_THREAD_ID" className="text-violet-600 underline">
          /inbox/TEST_THREAD_ID
        </Link>{' '}
        بروید.
      </p>
    </main>
  );
}

