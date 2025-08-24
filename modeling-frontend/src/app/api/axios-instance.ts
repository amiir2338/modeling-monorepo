// src/app/api/axios-instance.ts
import axios, { type AxiosInstance, type InternalAxiosRequestConfig, AxiosError } from 'axios';

/** API base from env (no trailing slash) */
const API_BASE = (
  process.env.NEXT_PUBLIC_API_BASE
  ?? process.env.NEXT_PUBLIC_API_URL
  ?? process.env.NEXT_PUBLIC_API_BASE_URL
  ?? 'http://localhost:4000/api'
).replace(/\/+$/, '');

/** Shared axios instance with strict typing */
export const axiosInstance: AxiosInstance = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  validateStatus: (status) => status >= 200 && status < 300,
});

/** Inject auth token from localStorage on client */
axiosInstance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  try {
    if (typeof window !== 'undefined') {
      const t = window.localStorage.getItem('access_token');
      if (t) {
        config.headers = config.headers || {};
        (config.headers as any)['Authorization'] = `Bearer ${t}`;
      }
    }
  } catch {}
  return config;
});

/** Normalize error */
axiosInstance.interceptors.response.use(
  (resp) => resp,
  (error: AxiosError) => {
    try {
      if (error.response?.status === 401 && typeof window !== 'undefined') {
        // Optional: clear & redirect
        // window.localStorage.removeItem('access_token');
        // window.location.href = '/login';
      }
      return Promise.reject(error);
    } catch {
      return Promise.reject(error);
    }
  }
);

export default axiosInstance;
