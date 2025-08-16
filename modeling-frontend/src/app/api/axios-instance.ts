// src/api/axios-instance.ts
import axios from 'axios';

export const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL, // می‌خونه از .env.local
});

// اگر توکن داری، قبل از هر درخواست اتوماتیک روی هدر ست می‌شه
axiosInstance.interceptors.request.use((config) => {
  try {
    const token =
      typeof window !== 'undefined'
        ? localStorage.getItem('access_token')
        : null;

    if (token) {
      config.headers = config.headers ?? {};
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch {}
  return config;
});
