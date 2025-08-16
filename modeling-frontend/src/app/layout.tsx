import './repeat-guard';
import './globals.css'
import './styles/ui.css'
import type { Metadata, Viewport } from 'next';
import { Vazirmatn } from 'next/font/google';
import React from 'react';
import ThemeToggle from '../components/ThemeToggle'; // Ø§Ú¯Ø± Ù‚Ø¨Ù„Ø§Ù‹ Ø³Ø§Ø®ØªÛŒÙ…
import BrandSwitch from '../components/BrandSwitch';

export const metadata: Metadata = {
  title: 'Modeling â€” Ø¢Ù…ÙˆØ²Ø´ Ùˆ ÙØ±ØµØªâ€ŒÙ‡Ø§ÛŒ Ù…Ø¯Ù„ÛŒÙ†Ú¯',
  description: 'Ù¾Ù„ØªÙØ±Ù… Ø¢Ù…ÙˆØ²Ø´ Ø±Ø§ÛŒÚ¯Ø§Ù† Ù…Ø¯Ù„ÛŒÙ†Ú¯ + Ø«Ø¨Øª Ùˆ Ù…Ø¯ÛŒØ±ÛŒØª Ø¢Ú¯Ù‡ÛŒâ€ŒÙ‡Ø§ÛŒ Ù‡Ù…Ú©Ø§Ø±ÛŒ',
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
        {/* Ù‡Ø¯Ø± Ø¨Ø±Ù†Ø¯ÛŒ */}
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
              {/* Ø§Ú¯Ø± ThemeToggle Ø¯Ø§Ø±ÛŒ */}
              <ThemeToggle />
            </div>
          </div>
        </header>

        {/* Ø¨Ú©â€ŒÚ¯Ø±Ø§Ù†Ø¯ Ù„Ø·ÛŒÙ ØµÙØ­Ù‡ */}
        <div className="bg-hero">
          <main className="container-std py-8">{children}</main>
        </div>

        <footer className="border-t border-slate-200/60 dark:border-slate-700/50 py-8 text-center text-sm text-slate-500">
          Â© {new Date().getFullYear()} Modeling â€” Ø¢Ù…ÙˆØ²Ø´ Ùˆ ÙØ±ØµØªâ€ŒÙ‡Ø§ÛŒ Ù…Ø¯Ù„ÛŒÙ†Ú¯
        </footer>
      </body>
    </html>
  );
}

