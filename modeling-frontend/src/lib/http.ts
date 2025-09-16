// src/lib/api/http.ts
import axios, { AxiosRequestConfig, AxiosError } from 'axios';
import { getApiBase } from '@/lib/env';

/**
 * Shared axios instance for code that expects raw response.data (not ApiEnvelope)
 * Uses centralized getApiBase() so we don't accidentally produce '/api/api/...'
 */
const BASE = getApiBase();

const http = axios.create({
  baseURL: BASE || '',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

http.interceptors.request.use((cfg) => {
  if (cfg.headers && 'Authorization' in cfg.headers) {
    delete (cfg.headers as Record<string, unknown>)['Authorization'];
  }
  cfg.withCredentials = true;
  return cfg;
});

http.interceptors.response.use(
  (res) => res,
  (error: AxiosError<any>) => {
    const resp = error.response;
    const data = resp?.data;
    const serverMsg =
      (data && (data.message || data.error)) ||
      (resp && `خطای ${resp.status}`) ||
      error.message ||
      'Request failed';
    return Promise.reject(new Error(serverMsg));
  }
);

export default http;

export async function getJSON<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const res = await http.get<T>(url, config);
  return res.data as T;
}

export async function postJSON<T = any, B = any>(url: string, body?: B, config?: AxiosRequestConfig): Promise<T> {
  const res = await http.post<T>(url, body, config);
  return res.data as T;
}

export async function patchJSON<T = any, B = any>(url: string, body?: B, config?: AxiosRequestConfig): Promise<T> {
  const res = await http.patch<T>(url, body, config);
  return res.data as T;
}

export async function putJSON<T = any, B = any>(url: string, body?: B, config?: AxiosRequestConfig): Promise<T> {
  const res = await http.put<T>(url, body, config);
  return res.data as T;
}

export async function delJSON<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const res = await http.delete<T>(url, config);
  return res.data as T;
}
