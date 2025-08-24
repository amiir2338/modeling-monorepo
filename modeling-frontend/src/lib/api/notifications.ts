import axios from "@/app/api/axios-instance";

export async function fetchNotifications(params?: { limit?: number }) {
  const { data } = await axios.get("/v1/notifications", { params });
  return data;
}

export async function readNotification(id: string) {
  const { data } = await axios.patch(`/v1/notifications/${id}/read`);
  return data;
}

export async function deleteNotification(id: string) {
  const { data } = await axios.delete(`/v1/notifications/${id}`);
  return data;
}
