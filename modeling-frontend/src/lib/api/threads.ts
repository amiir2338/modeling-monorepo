import axios from "@/app/api/axios-instance";

// لیست تردها
export async function fetchThreads(params?: { page?: number; q?: string }) {
  const { data } = await axios.get("/v1/threads", { params });
  return data;
}

// تعداد خوانده‌نشده‌ها
export async function fetchUnreadCount() {
  const { data } = await axios.get("/v1/threads/unread-count");
  return data?.count ?? 0;
}

// مارک خواندن همه
export async function markThreadReadAll(threadId: string) {
  const { data } = await axios.patch(`/v1/threads/${threadId}/read-all`);
  return data;
}
