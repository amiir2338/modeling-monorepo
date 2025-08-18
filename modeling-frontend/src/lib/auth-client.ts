// src/lib/auth-client.ts
// توابع OTP با axiosInstance تا BASE یکتا باشد.

import { axiosInstance } from '../app/api/axios-instance';

export async function requestOtp(phone: string) {
  const { data } = await axiosInstance.post('/v1/auth/otp/request', { phone });
  return data;
}

export async function verifyOtp(phone: string, code: string): Promise<string> {
  const { data } = await axiosInstance.post('/v1/auth/otp/verify', { phone, code });
  return data.token as string;
}
