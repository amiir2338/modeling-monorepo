// src/lib/api/jobs.ts
// API for jobs (create, submit, approve, apply)

export interface JobDTO {
  _id: string;
  clientId: string;
  title: string;
  description?: string;
  budget?: number;
  city?: string;
  date?: string | null;
  status: 'draft' | 'pending_review' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse<T> {
  ok: boolean;
  job?: T;
  application?: unknown;
  message?: string;
}

import { getApiBase } from '@/lib/env';

// getApiBase returns host-only base (no trailing '/api') or '' for same-origin.
const API_HOST =
  (typeof window !== 'undefined' && (window as any).NEXT_PUBLIC_API_BASE) ||
  getApiBase() ||
  'http://localhost:4000';

// buildUrl ensures we always call /api/... on the correct host (same-origin or configured host)
function buildUrl(path: string) {
  // path may be '/v1/...', '/api/v1/...' or 'v1/...'
  const p = path.startsWith('/') ? path : `/${path}`;
  if (p.startsWith('/api/')) return `${API_HOST}${p}`; // already includes /api
  return `${API_HOST}/api${p}`; // ensure /api prefix
}

async function postJSON<T>(
  url: string,
  body: unknown,
  token?: string
): Promise<T> {
  const res = await fetch(buildUrl(url), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    } as HeadersInit,
    body: JSON.stringify(body ?? {}),
    credentials: 'include',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (data && (data.message || data.error)) || res.statusText;
    throw new Error(msg);
  }
  return data as T;
}

async function patchJSON<T>(
  url: string,
  body: unknown,
  token?: string
): Promise<T> {
  const res = await fetch(buildUrl(url), {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    } as HeadersInit,
    body: JSON.stringify(body ?? {}),
    credentials: 'include',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (data && (data.message || data.error)) || res.statusText;
    throw new Error(msg);
  }
  return data as T;
}

// =============================
// JOB APIs
// =============================

export async function createJob(
  input: { title: string; description?: string; budget?: number; city?: string; date?: string | null },
  token?: string
): Promise<ApiResponse<JobDTO>> {
  return postJSON<ApiResponse<JobDTO>>('/v1/jobs', input, token);
}

export async function submitJob(
  jobId: string,
  token?: string
): Promise<ApiResponse<JobDTO>> {
  return postJSON<ApiResponse<JobDTO>>(
    `/v1/jobs/${jobId}/submit`,
    { termsAccepted: true },
    token
  );
}

export async function approveJob(
  jobId: string,
  token?: string
): Promise<ApiResponse<JobDTO>> {
  return patchJSON<ApiResponse<JobDTO>>(`/v1/jobs/${jobId}/approve`, {}, token);
}

export async function applyJob(
  jobId: string,
  message: string,
  token?: string
): Promise<ApiResponse<unknown>> {
  return postJSON<ApiResponse<unknown>>(
    `/v1/jobs/${jobId}/apply`,
    { message },
    token
  );
}

