// ساده و مقاوم: فقط وقتی توکن داشتیم کانکت شو، و خطاها رو هندل کن.
import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export function getSocket(token?: string) {
  if (!token) return null;
  if (socket && socket.connected) return socket;

  socket = io(process.env.NEXT_PUBLIC_API_BASE ?? "", {
    transports: ["websocket"],
    auth: { token }, // سرور شما از jwt تو auth استفاده می‌کند
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
  });

  socket.on("connect_error", (e) => console.warn("socket connect_error:", e.message));
  return socket;
}

export function disconnectSocket() {
  try { socket?.disconnect(); } catch {}
  socket = null;
}
