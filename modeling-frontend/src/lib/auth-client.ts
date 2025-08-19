// ELI5:
// این فایل فقط دو تابع دارد:
// 1) requestOtp: شماره را به سرور می‌دهد تا کد ارسال شود
// 2) verifyOtp: شماره و کد را می‌دهد تا توکن (JWT) بگیریم

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE || '';

export async function requestOtp(phone: string) {
  const res = await fetch(`${BASE_URL}/api/v1/auth/otp/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OTP request failed: ${text}`);
  }
  return res.json();
}

export async function verifyOtp(phone: string, code: string): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/v1/auth/otp/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, code }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OTP verify failed: ${text}`);
  }
  const data = await res.json();
  // انتظار داریم سرور { ok:true, token:'...' } برگرداند
  return data.token as string;
}
