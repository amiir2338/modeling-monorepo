// src/app/api/axios-instance.ts
import axios, { AxiosHeaders } from 'axios';
import type { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
const API_BASE = (process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:4000/api').replace(/\/+$/, '');
export const axiosInstance: AxiosInstance = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  validateStatus: (s) => s >= 200 && s < 300,
});
axiosInstance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token');
    if (token) {
      if (!config.headers) config.headers = new AxiosHeaders();
      if (config.headers instanceof AxiosHeaders) {
        config.headers.set('Authorization', `Bearer ${token}`);
        if (!config.headers.get('Content-Type')) config.headers.set('Content-Type', 'application/json');
      } else {
        (config.headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
        if (!(config.headers as Record<string, string>)['Content-Type']) (config.headers as Record<string, string>)['Content-Type'] = 'application/json';
      }
    }
  }
  return config;
});
axiosInstance.interceptors.response.use((res)=>res,(error)=>{ try{ if(error?.response){ console.error('[axios]', error.response.status, error.response.data);} else { console.error('[axios]', String(error)); } }catch{} return Promise.reject(error); });
export default axiosInstance;
