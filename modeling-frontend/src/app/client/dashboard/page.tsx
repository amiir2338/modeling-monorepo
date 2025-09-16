import StatCard from "@/app/client/dashboard/client/StatCard";

export default function ClientDashboardPage() {
  // داده‌های موک برای نمایش اولیه
  const stats = [
    { label: "درخواست‌های باز", value: 8, hint: "+2 امروز" },
    { label: "پیغام‌های جدید", value: 14, hint: "3 خوانده‌نشده" },
    { label: "پروژه‌های فعال", value: 5, hint: "1 در خطر تأخیر" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-xl md:text-2xl font-semibold">داشبورد کلاینت</h1>

      <section className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </section>

      <section className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        <div className="bg-white rounded-2xl shadow-sm p-4 md:p-6 border lg:col-span-2">
          <h2 className="font-medium mb-4">آخرین فعالیت‌ها</h2>
          <ul className="space-y-3 text-sm">
            <li>• اپلود نمونه‌کار جدید توسط شما ثبت شد.</li>
            <li>• پیام پشتیبانی پاسخ داده شد.</li>
            <li>• وضعیت پروژه «کمپ جنگل الفت» به In-Progress تغییر کرد.</li>
          </ul>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-4 md:p-6 border">
          <h2 className="font-medium mb-4">اقدامات سریع</h2>
          <div className="flex flex-wrap gap-2">
            <button className="px-3 py-2 rounded-xl border hover:bg-gray-50">ثبت تیکت</button>
            <button className="px-3 py-2 rounded-xl border hover:bg-gray-50">آپلود فایل</button>
            <button className="px-3 py-2 rounded-xl border hover:bg-gray-50">درخواست جلسه</button>
          </div>
        </div>
      </section>
    </div>
  );
}

