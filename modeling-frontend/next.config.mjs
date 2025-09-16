/**
 * Minimal Next.js config to add a dev-time rewrite for /api requests to
 * the locally-running backend. This helps avoid cross-host CORS and IPv6
 * race issues in CI and Playwright by keeping API calls same-origin.
 *
 * This file is intentionally small and only applied in development.
 */
const isDev = process.env.NODE_ENV !== 'production';

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  // Only add rewrites in dev - production should use real backend hostname
  async rewrites() {
    if (!isDev) return [];
    return [
      {
        source: '/api/:path*',
        destination: 'http://127.0.0.1:4000/api/:path*',
      },
    ];
  },
};

export default config;
