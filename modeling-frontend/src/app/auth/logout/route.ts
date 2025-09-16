import { NextResponse } from "next/server";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "@/lib/auth/auth-keys";

export async function POST(request: Request) {
  // مقصد بعد از خروج
  const url = new URL("/auth/login", request.url);

  const res = NextResponse.redirect(url);

  // روش 1: delete مستقیم
  res.cookies.delete(ACCESS_TOKEN_COOKIE);
  res.cookies.delete(REFRESH_TOKEN_COOKIE);

  // روش 2 (پُشتوانه): ست با انقضا گذشته، اگر delete به‌خاطر path/domain نگرفت
  res.cookies.set({
    name: ACCESS_TOKEN_COOKIE,
    value: "",
    httpOnly: true,
    path: "/",
    expires: new Date(0),
    maxAge: 0,
    sameSite: "lax",
  });
  res.cookies.set({
    name: REFRESH_TOKEN_COOKIE,
    value: "",
    httpOnly: true,
    path: "/",
    expires: new Date(0),
    maxAge: 0,
    sameSite: "lax",
  });

  return res;
}

