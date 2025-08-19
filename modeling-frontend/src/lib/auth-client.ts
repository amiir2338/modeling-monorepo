// src/lib/auth-client.ts
// توابع احراز هویت مبتنی بر ایمیل/پسورد (هماهنگ با بک‌اند فعلی)

import { axiosInstance } from '../app/api/axios-instance';

type LoginResponse = {
  ok?: boolean;
  token: string;
  data?: {
    _id: string;
    email: string;
    role: string;
    name?: string | null;
    clientId?: string | null;
  };
  message?: string;
};

export async function registerUser(payload: { email: string; password: string; name?: string | null; role?: 'model'|'client'|'admin' }) {
  const { data } = await axiosInstance.post<LoginResponse>('/v1/auth/register', payload);
  return data;
}

export async function loginUser(email: string, password: string) {
  const { data } = await axiosInstance.post<LoginResponse>('/v1/auth/login', { email, password });
  return data;
}
