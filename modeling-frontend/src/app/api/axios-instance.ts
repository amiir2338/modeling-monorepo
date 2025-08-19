// src/app/api/axios-instance.ts
// Axios instance with base URL and auth header injection.

import axios from 'axios';
import type { AxiosInstance, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';

const ORIGIN = (process.env.NEXT_PUBLIC_API_ORIGIN ?? 'http://localhost:4000').replace(/\/+$/, '');

export const axiosInstance: AxiosInstance = axios.create({
  baseURL: `${ORIGIN}/api`,
  timeout: 15000,
  validateStatus: (s) => s >= 200 && s < 300,
});

axiosInstance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      const headers = (config.headers ?? {}) as AxiosRequestConfig['headers'];
      config.headers = { ...(headers || {}), Authorization: `Bearer ${token}` };
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
