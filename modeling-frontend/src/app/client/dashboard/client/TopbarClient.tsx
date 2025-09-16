"use client";

import LogoutButton from "@/components/LogoutButton";

export default function TopbarClient() {
  return (
    <div className="h-14 flex items-center justify-between px-3 md:px-4 border-b bg-white">
      <div className="text-sm text-gray-600">
        خوش آمدید ✨
      </div>
      <div className="flex items-center gap-2">
        <input
          className="h-9 w-44 md:w-64 rounded-xl border px-3 text-sm outline-none focus:ring-2 focus:ring-gray-200"
          placeholder="جستجو..."
        />
        <button className="h-9 px-3 rounded-xl border hover:bg-gray-50 text-sm">پروفایل</button>
        <LogoutButton />
      </div>
    </div>
  );
}

