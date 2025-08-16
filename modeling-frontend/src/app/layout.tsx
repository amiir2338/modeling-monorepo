import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Vazirmatn } from 'next/font/google';
import React from 'react';

export const metadata: Metadata = {
  title: 'Modeling — آموزش و فرصت‌های مدلینگ',
  description: 'پلتفرم آموزش رایگان مدلینگ + ثبت و مدیریت آگهی‌های همکاری',
  icons: { icon: '/favicon.ico' }, // اگر آیکون داری مسیرش رو اینجا بده
  themeColor: '#ffffff',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
};

const vazir = Vazirmatn({
  subsets: ['arabic', 'latin'],
  weight: ['300', '400', '500', '700', '800'],
  display: 'swap',
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl" className={vazir.className}>
      <body className="bg-app text-slate-800 antialiased">
        {/* هدر */}
        <header className="sticky top-0 z-20 border-b bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/50">
          <div className="container mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="size-7 rounded-xl bg-gradient-to-tr from-fuchsia-500 to-indigo-500" />
              <span className="font-bold">Modeling</span>
            </div>
            <nav className="text-sm opacity-80">به دنیای مدلینگ خوش اومدی ✨</nav>
          </div>
        </header>

        {/* بک‌گراند لطیف + محتوا */}
        <div className="relative">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60rem_30rem_at_80%_-10%,#c7d2fe15,transparent),radial-gradient(50rem_25rem_at_10%_-10%,#f5d0fe20,transparent)]" />
          <main className="relative container mx-auto max-w-6xl px-4 py-6">{children}</main>
        </div>

        <footer className="border-t py-6 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} Modeling — آموزش و فرصت‌های مدلینگ
        </footer>
      </body>
    </html>
  );
}
