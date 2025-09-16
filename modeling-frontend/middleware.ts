// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PROTECTED = [/^\/dashboard(\/|$)/, /^\/admin(\/|$)/];
const PUBLIC_PREFIXES = ['/_next', '/favicon.ico', '/images', '/uploads', '/public', '/fonts', '/api', '/auth'];

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  // Debug: log middleware evaluations to help E2E diagnosis
  // eslint-disable-next-line no-console
  console.log(`[MW] request to ${pathname} search=${search}`);
  if (PUBLIC_PREFIXES.some(p => pathname.startsWith(p))) return NextResponse.next();

  const hasAuth =
    !!req.cookies.get('auth')?.value ||
    !!req.cookies.get('access_token')?.value ||
    !!req.cookies.get('token')?.value;
  // eslint-disable-next-line no-console
  console.log(`[MW] hasAuth=${String(!!hasAuth)}`);

  const needsAuth = PROTECTED.some(rx => rx.test(pathname));

  // ناشناس → مسیرهای محافظت‌شده → لاگین (+ next برای بازگشت)
  if (needsAuth && !hasAuth) {
    const url = req.nextUrl.clone();
    url.pathname = '/auth/login';
    url.searchParams.set('next', pathname + (search || ''));
    return NextResponse.redirect(url);
  }

  // کاربر لاگین کرده و روی /auth/* آمده → بفرستش داشبورد
  if (hasAuth && /^\/auth\/(login|register)/.test(pathname)) {
    const url = req.nextUrl.clone();
    url.pathname = '/dashboard/client/jobs';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next|favicon.ico|images|uploads|public|fonts).*)'],
};
