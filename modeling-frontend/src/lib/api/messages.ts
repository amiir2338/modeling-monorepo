import axios from "@/app/api/axios-instance";

export async function fetchMessages(threadId: string) {
  const { data } = await axios.get("/v1/messages", { params: { threadId } });
  return data; // { items: Message[], ... }
}

export async function sendMessage(payload: { threadId: string; text: string }) {
  const { data } = await axios.post("/v1/messages", payload);
  return data;
}
