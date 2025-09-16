import { cookies } from "next/headers";
import { ACCESS_TOKEN_COOKIE } from "./auth-keys";

export type Session = {
  isAuthenticated: boolean;
  accessToken?: string;
};

// ⬇️ نسخه سازگار با نسخه‌هایی که cookies() را Promise برمی‌گردانند
export async function getSession(): Promise<Session> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  return {
    isAuthenticated: Boolean(token),
    accessToken: token,
  };
}

