// src/app/api/axios-instance.ts
// یک کلاینت axios با مبدأ یکتا + اضافه‌کردن توکن از localStorage

import axios from 'axios';

const ORIGIN = (process.env.NEXT_PUBLIC_API_ORIGIN ?? 'http://localhost:4000').replace(/\/+$/, '');

export const axiosInstance = axios.create({
  baseURL: `${ORIGIN}/api`,
  timeout: 15000,
  validateStatus: (s) => s >= 200 && s < 300,
});

axiosInstance.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers = config.headers ?? {};
      (config.headers as any).Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

axiosInstance.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error?.response) {
      // eslint-disable-next-line no-console
      console.error('[axios]', error.response.status, error.response.data);
    } else {
      // eslint-disable-next-line no-console
      console.error('[axios]', String(error));
    }
    return Promise.reject(error);
  }
);
