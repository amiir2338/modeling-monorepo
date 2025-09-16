"use client";
import Link from "next/link";

// NOTE: `usePathname` typing sometimes mismatches with Next/React types in this repo's setup.
// Use a tiny runtime-safe fallback that reads `window.location.pathname` when available.
function useSafePathname(): string | null {
  try {
    if (typeof window !== 'undefined') return window.location.pathname;
  } catch (e) {
    // noop
  }
  return null;
}

const items = [
  { href: "/client/dashboard", label: "داشبورد" },
  { href: "/client/projects", label: "پروژه‌ها" },
  { href: "/client/messages", label: "پیام‌ها" },
  { href: "/client/files", label: "فایل‌ها" },
  { href: "/client/settings", label: "تنظیمات" },
];

export default function SidebarClient() {
  const pathname = useSafePathname();
  return (
    <nav className="p-4 space-y-2">
      <div className="px-2 py-3 font-semibold">پنل کاربر</div>
      <ul className="space-y-1">
        {items.map((it) => {
          const active = pathname?.startsWith(it.href);
          return (
            <li key={it.href}>
              <Link
                href={it.href}
                className={`block px-3 py-2 rounded-xl border
                  ${active ? "bg-gray-100 border-gray-300" : "border-transparent hover:bg-gray-50"}`}
              >
                {it.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

