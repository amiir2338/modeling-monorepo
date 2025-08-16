import './globals.css'
import './styles/ui.css'
import type { Metadata, Viewport } from 'next';
import { Vazirmatn } from 'next/font/google';
import React from 'react';
import ThemeToggle from '../components/ThemeToggle'; // اگر قبلاً ساختیم
import BrandSwitch from '../components/BrandSwitch';

export const metadata: Metadata = {
  title: 'Modeling — آموزش و فرصت‌های مدلینگ',
  description: 'پلتفرم آموزش رایگان مدلینگ + ثبت و مدیریت آگهی‌های همکاری',
  icons: { icon: '/favicon.ico' },
  themeColor: '#ffffff',
};

export const viewport: Viewport = {
  width: 'device-width', initialScale: 1, maximumScale: 1, viewportFit: 'cover',
};

const vazir = Vazirmatn({
  subsets: ['arabic', 'latin'],
  weight: ['300','400','500','700','800'],
  display: 'swap',
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl" className={vazir.className}>
      <body className="bg-app">
        {/* هدر برندی */}
        <header className="sticky top-0 z-40 border-b border-slate-200/60 bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/50 dark:border-slate-700/50">
          <div className="container-std h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-xl"
                style={{ background: 'linear-gradient(135deg, var(--brand-1), var(--brand-2))' }}
              />
              <div className="font-extrabold text-lg brand-gradient-text">Modeling</div>
            </div>
            <div className="flex items-center gap-2">
              <BrandSwitch />
              {/* اگر ThemeToggle داری */}
              <ThemeToggle />
            </div>
          </div>
        </header>

        {/* بک‌گراند لطیف صفحه */}
        <div className="bg-hero">
          <main className="container-std py-8">{children}</main>
        </div>

        <footer className="border-t border-slate-200/60 dark:border-slate-700/50 py-8 text-center text-sm text-slate-500">
          © {new Date().getFullYear()} Modeling — آموزش و فرصت‌های مدلینگ
        </footer>
      </body>
    </html>
  );
}
