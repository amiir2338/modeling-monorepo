// src/app/api/axios-instance.ts
import axios from 'axios';

// ELI5: این کلاینتِ آمادهٔ axios هست تا هر بار baseURL و توکن رو دستی نذاریم.
export const axiosInstance = axios.create({
  // اگر ENV ست بود از اون استفاده می‌کنیم؛ وگرنه localhost
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000',
  withCredentials: true,
});

// ELI5: قبل از هر درخواست، اگر توکن داریم به هدر اضافه کن
axiosInstance.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers = config.headers ?? {};
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});
