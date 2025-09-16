"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

import { getApiBase } from "../../../../lib/env";

// Use centralized helper that returns host-only base (no trailing /api). In browser runtime
// getApiBase() returns '' so callers should prepend '/api' for same-origin calls.
function apiPrefix(): string {
  const host = getApiBase();
  return host ? `${host}/api` : "/api";
}

export type JobStatus = "draft" | "pending_review" | "approved" | "rejected" | "archived";

interface Job {
  _id: string;
  title: string;
  budget: string | null;
  city: string | null;
  description: string | null;
  requirements: string[];
  status: JobStatus;
  createdAt: string;
  updatedAt: string;
}

type JobsListResponse = Job[] | { data?: Job[]; jobs?: Job[]; ok?: boolean; total?: number };

function extractJobs(resp: JobsListResponse): Job[] {
  if (Array.isArray(resp)) return resp;
  if (resp.data && Array.isArray(resp.data)) return resp.data;
  if (resp.jobs && Array.isArray(resp.jobs)) return resp.jobs;
  return [];
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

async function safeFetch<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    credentials: "include",
    ...init,
  });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const j = await res.json();
      msg = j?.message || j?.error || msg;
    } catch {}
    throw new Error(msg);
  }
  return (await res.json()) as T;
}

export default function AdminJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<JobStatus | "all">("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const abortRef = useRef<AbortController | null>(null);

  const listUrl = useMemo(() => {
    const prefix = apiPrefix();
    // Build URL string without relying on `window` (safe for SSR/dev)
    let url = prefix.replace(/\/+$/,'') + "/v1/jobs";
    const params: string[] = [];
    if (query.trim()) params.push(`q=${encodeURIComponent(query.trim())}`);
    if (statusFilter !== "all") params.push(`status=${encodeURIComponent(statusFilter)}`);
    if (params.length) url += `?${params.join('&')}`;
    return url;
  }, [query, statusFilter]);

  const fetchJobs = async () => {
    setLoading(true);
    setErrorMsg("");
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    try {
  const data = await safeFetch<JobsListResponse>(listUrl, { method: "GET", signal: controller.signal });
      setJobs(extractJobs(data));
    } catch (err: any) {
      setErrorMsg(err.message || "خطای ناشناخته");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchJobs();
    return () => abortRef.current?.abort();
  }, [listUrl]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const deleteOne = async (id: string) => {
    if (!confirm("حذف شود؟")) return;
    try {
  await safeFetch(apiPrefix() + `/v1/jobs/${id}`, { method: "DELETE" });
      setJobs((prev) => prev.filter((j) => j._id !== id));
    } catch (err: any) {
      alert(err.message || "خطا در حذف");
    }
  };

  const deleteSelected = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`حذف ${selectedIds.size} مورد؟`)) return;
    try {
      for (const id of Array.from(selectedIds)) {
  await safeFetch(apiPrefix() + `/v1/jobs/${id}`, { method: "DELETE" });
      }
      setJobs((prev) => prev.filter((j) => !selectedIds.has(j._id)));
      setSelectedIds(new Set());
    } catch (err: any) {
      alert(err.message || "خطا در حذف گروهی");
    }
  };

  const approveJob = async (id: string) => {
    try {
  await safeFetch(apiPrefix() + `/v1/jobs/${id}/approve`, { method: "PATCH" });
      setJobs((prev) => prev.map((j) => (j._id === id ? { ...j, status: "approved" } : j)));
    } catch (err: any) {
      alert(err.message || "خطا در تایید آگهی");
    }
  };

  const rejectJob = async (id: string) => {
    const reason = prompt("علت رد را وارد کنید:") || "";
    try {
      await safeFetch(apiPrefix() + `/v1/jobs/${id}/reject`, {
        method: "PATCH",
        body: JSON.stringify({ reason }),
      });
      setJobs((prev) => prev.map((j) => (j._id === id ? { ...j, status: "rejected" } : j)));
    } catch (err: any) {
      alert(err.message || "خطا در رد آگهی");
    }
  };

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold mb-4">مدیریت آگهی‌های شغلی</h1>
      <div className="flex gap-2 mb-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="جستجو..."
          className="border rounded px-3 py-2 w-64"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="border rounded px-3 py-2"
        >
          <option value="all">همه</option>
          <option value="draft">پیش‌نویس</option>
          <option value="pending_review">در انتظار بررسی</option>
          <option value="approved">تایید شده</option>
          <option value="rejected">رد شده</option>
          <option value="archived">آرشیو</option>
        </select>
        <button onClick={() => void fetchJobs()} disabled={loading} className="border rounded px-3 py-2">
          {loading ? "..." : "رفرش"}
        </button>
        <button onClick={() => void deleteSelected()} disabled={selectedIds.size === 0} className="border rounded px-3 py-2">
          حذف انتخاب‌شده‌ها
        </button>
      </div>
      {errorMsg && <div className="text-red-600 mb-3">{errorMsg}</div>}
      <div className="overflow-x-auto border rounded">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-2"></th>
              <th className="p-2 text-left">عنوان</th>
              <th className="p-2 text-left">شهر</th>
              <th className="p-2 text-left">بودجه</th>
              <th className="p-2 text-left">وضعیت</th>
              <th className="p-2 text-left">تاریخ ایجاد</th>
              <th className="p-2 text-left">اکشن‌ها</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => {
              const selected = selectedIds.has(job._id);
              return (
                <tr key={job._id} data-testid={`job-row-${job._id}`} className={selected ? "bg-green-50" : "bg-white"}>
                  <td className="p-2"><input type="checkbox" checked={selected} onChange={() => toggleSelect(job._id)} /></td>
                  <td className="p-2">{job.title}</td>
                  <td className="p-2">{job.city ?? "-"}</td>
                  <td className="p-2">{job.budget ?? "-"}</td>
                  <td className="p-2"><StatusBadge status={job.status} /></td>
                  <td className="p-2">{formatDate(job.createdAt)}</td>
                  <td className="p-2 flex gap-2">
                    <button
                      data-testid={`job-approve-${job._id}`}
                      aria-label={`approve-job-${job._id}`}
                      onClick={() => approveJob(job._id)}
                      disabled={job.status === "approved"}
                      className="text-green-700 underline"
                    >
                      تایید
                    </button>
                    <button
                      data-testid={`job-reject-${job._id}`}
                      aria-label={`reject-job-${job._id}`}
                      onClick={() => rejectJob(job._id)}
                      disabled={job.status === "rejected"}
                      className="text-red-700 underline"
                    >
                      رد
                    </button>
                    <button
                      data-testid={`job-delete-${job._id}`}
                      aria-label={`delete-job-${job._id}`}
                      onClick={() => deleteOne(job._id)}
                      className="text-gray-700 underline"
                    >
                      حذف
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </main>
  );
}

function StatusBadge({ status }: { status: JobStatus }) {
  const color =
    status === "approved" ? "bg-green-100 text-green-800" :
    status === "rejected" ? "bg-red-100 text-red-800" :
    status === "pending_review" ? "bg-yellow-100 text-yellow-800" :
    status === "archived" ? "bg-gray-100 text-gray-800" :
    "bg-blue-100 text-blue-800";
  return <span className={`px-2 py-1 rounded text-xs ${color}`}>{status}</span>;
}
