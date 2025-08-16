import './repeat-guard';
import './globals.css'
import './styles/ui.css'
import type { Metadata, Viewport } from 'next';
import { Vazirmatn } from 'next/font/google';
import React from 'react';
import ThemeToggle from '../components/ThemeToggle'; // Ã˜Â§ÃšÂ¯Ã˜Â± Ã™â€šÃ˜Â¨Ã™â€žÃ˜Â§Ã™â€¹ Ã˜Â³Ã˜Â§Ã˜Â®Ã˜ÂªÃ›Å’Ã™â€¦
import BrandSwitch from '../components/BrandSwitch';

export const metadata: Metadata = {
  title: 'Modeling Ã¢â‚¬â€ Ã˜Â¢Ã™â€¦Ã™Ë†Ã˜Â²Ã˜Â´ Ã™Ë† Ã™ÂÃ˜Â±Ã˜ÂµÃ˜ÂªÃ¢â‚¬Å’Ã™â€¡Ã˜Â§Ã›Å’ Ã™â€¦Ã˜Â¯Ã™â€žÃ›Å’Ã™â€ ÃšÂ¯',
  description: 'Ã™Â¾Ã™â€žÃ˜ÂªÃ™ÂÃ˜Â±Ã™â€¦ Ã˜Â¢Ã™â€¦Ã™Ë†Ã˜Â²Ã˜Â´ Ã˜Â±Ã˜Â§Ã›Å’ÃšÂ¯Ã˜Â§Ã™â€  Ã™â€¦Ã˜Â¯Ã™â€žÃ›Å’Ã™â€ ÃšÂ¯ + Ã˜Â«Ã˜Â¨Ã˜Âª Ã™Ë† Ã™â€¦Ã˜Â¯Ã›Å’Ã˜Â±Ã›Å’Ã˜Âª Ã˜Â¢ÃšÂ¯Ã™â€¡Ã›Å’Ã¢â‚¬Å’Ã™â€¡Ã˜Â§Ã›Å’ Ã™â€¡Ã™â€¦ÃšÂ©Ã˜Â§Ã˜Â±Ã›Å’',
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
      <head>
        <meta charSet="utf-8" />
      </head>
      <body className="bg-app">
        {/* Ã™â€¡Ã˜Â¯Ã˜Â± Ã˜Â¨Ã˜Â±Ã™â€ Ã˜Â¯Ã›Å’ */}
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
              {/* Ã˜Â§ÃšÂ¯Ã˜Â± ThemeToggle Ã˜Â¯Ã˜Â§Ã˜Â±Ã›Å’ */}
              <ThemeToggle />
            </div>
          </div>
        </header>

        {/* Ã˜Â¨ÃšÂ©Ã¢â‚¬Å’ÃšÂ¯Ã˜Â±Ã˜Â§Ã™â€ Ã˜Â¯ Ã™â€žÃ˜Â·Ã›Å’Ã™Â Ã˜ÂµÃ™ÂÃ˜Â­Ã™â€¡ */}
        <div className="bg-hero">
          <main className="container-std py-8">{children}</main>
        </div>

        <footer className="border-t border-slate-200/60 dark:border-slate-700/50 py-8 text-center text-sm text-slate-500">
          Ã‚Â© {new Date().getFullYear()} Modeling Ã¢â‚¬â€ Ã˜Â¢Ã™â€¦Ã™Ë†Ã˜Â²Ã˜Â´ Ã™Ë† Ã™ÂÃ˜Â±Ã˜ÂµÃ˜ÂªÃ¢â‚¬Å’Ã™â€¡Ã˜Â§Ã›Å’ Ã™â€¦Ã˜Â¯Ã™â€žÃ›Å’Ã™â€ ÃšÂ¯
        </footer>
      </body>
    </html>
  );
}


