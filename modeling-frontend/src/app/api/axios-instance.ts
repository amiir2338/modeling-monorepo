/* src/app/api/axios-instance.ts (or similar) */
import axios, { AxiosError, AxiosHeaders, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';

/** API base from env (no trailing slash) */
const API_BASE = (process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:4000/api').replace(/\/+$/, '');

/** Shared axios instance with strict typing */
export const axiosInstance: AxiosInstance = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  // Only treat 2xx as success. Other codes go to the response error interceptor.
  validateStatus: (status) => status >= 200 && status < 300,
});

/** Inject auth token from localStorage on client */
axiosInstance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (typeof window !== 'undefined') {
    const token = window.localStorage.getItem('access_token');
    if (token) {
      // Ensure headers is a mutable AxiosHeaders to satisfy TS
      if (!config.headers) config.headers = new AxiosHeaders();
      if (config.headers instanceof AxiosHeaders) {
        config.headers.set('Authorization', `Bearer ${token}`);
        if (!config.headers.get('Content-Type')) config.headers.set('Content-Type', 'application/json');
      } else {
        // Fallback for edge cases (rare in Axios v1)
        (config.headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
        if (!(config.headers as Record<string, string>)['Content-Type']) {
          (config.headers as Record<string, string>)['Content-Type'] = 'application/json';
        }
      }
    }
  }
  return config;
});

/** Normalize errors & log unexpected ones (without crashing UI) */
axiosInstance.interceptors.response.use(
  (res) => res,
  (error: AxiosError) => {
    try {
      // Optional: central 401 handling
      if (error.response?.status === 401 && typeof window !== 'undefined') {
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
