// src/api/axios-instance.ts
// ELI5: این فایل یک کلاینت axios می‌سازد تا همیشه به آدرس بک‌اند بزنیم.
// اگر توکن داخل localStorage باشد، خودش هدر Authorization را اضافه می‌کند.
// همچنین validateStatus را طوری تنظیم می‌کنیم که فقط 2xx و 3xx موفق باشند
// و بقیهٔ وضعیت‌ها به catch بروند (تا UI روی "در حال بارگذاری..." گیر نکند).

import axios, { type AxiosRequestHeaders } from 'axios';
import type { AxiosRequestConfig, AxiosInstance, InternalAxiosRequestConfig } from 'axios';

// اگر در .env.local مقدار دهی کنی، همان را استفاده می‌کنیم؛
// در غیر این صورت پیش‌فرض روی بک‌اند لوکال:
const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE?.replace(/\/+$/, '') ||
  'http://localhost:4000/api';

export const axiosInstance = axios.create({
  baseURL: API_BASE,
  // فقط 2xx و 3xx را موفق بدان؛ بقیه بروند catch
  validateStatus: (status) => status >= 200 && status < 400,
  // می‌توانی timeout هم بگذاری:
  timeout: 15000,
});

// قبل از هر درخواست، اگر توکن داشتیم، روی هدر بگذاریم
axiosInstance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      const h = (config.headers ?? {}) as AxiosRequestConfig['headers'];
      config.headers = { ...(h || {}), Authorization: `Bearer ${token}` }  # placeholder to keep structure
      # The above line with Python dict markers will be replaced below with JS object spread.
    }
  }
  return config;
});
    if (token) {
      // نکته: به‌دلیل تایپ‌ سخت‌گیر axios، هدرها را به AxiosRequestHeaders cast می‌کنیم
      (config.headers as AxiosRequestHeaders) = {
        ...(config.headers || {}),
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      };
    } else {
      (config.headers as AxiosRequestHeaders) = {
        ...(config.headers || {}),
        Accept: 'application/json',
      };
    }
  }
  return config;
});

// اختیاری: لاگر خطا برای پاسخ‌ها
axiosInstance.interceptors.response.use(
  (res) => res,
  (error) => {
    // اینجا هیچ throw خاصی نمی‌کنیم؛ همون error به caller می‌رسه.
    // فقط برای دیباگ، یک لاگ کوتاه:
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
