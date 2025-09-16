// next.config.ts
import type { NextConfig } from 'next';

/**
 * ✅ همه‌ی درخواست‌های /api → به بک‌اند روی پورت 4000 پروکسی می‌شوند.
 *   آدرس بک‌اند را می‌توانی با ENV تغییر بدهی: BACKEND_ORIGIN (پیش‌فرض: http://localhost:4000)
 * ✅ هیچ گزینه‌ی ناسازگار با Turbopack (مثل experimental.typedRoutes) وجود ندارد.
 */
const BACKEND_ORIGIN = process.env.BACKEND_ORIGIN || 'http://localhost:4000';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        // Proxy frontend /api/* requests to backend at BACKEND_ORIGIN/api/*
        // The backend mounts its routes under /api, so include that prefix here.
        source: '/api/:path*',
        destination: `${BACKEND_ORIGIN}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
