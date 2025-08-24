import { ensureFile } from './helpers/fileOps.mjs';

const files = new Map([
  ['src/lib/socket.ts', `// src/lib/socket.ts
import { io } from 'socket.io-client';
let socket:any = null;
export function getSocket(token?:string){
  if (!token) return null;
  if (socket && socket.connected) return socket;
  socket = io(process.env.NEXT_PUBLIC_API_BASE ?? '', {
    transports: ['websocket'], auth: { token },
    reconnection: true, reconnectionAttempts: 10, reconnectionDelay: 1000,
  });
  socket.on('connect_error', (e:any) => console.warn('socket connect_error:', e?.message||e));
  return socket;
}
export function disconnectSocket(){ try{ socket?.disconnect(); }catch{} socket=null; }
`],
  ['src/lib/api/threads.ts', `import axios from '@/app/api/axios-instance';
export async function fetchThreads(params?:any){ const { data } = await axios.get('/v1/threads',{ params }); return data; }
export async function fetchUnreadCount(){ const { data } = await axios.get('/v1/threads/unread-count'); return data?.count ?? 0; }
export async function markThreadReadAll(id:string){ const { data } = await axios.patch('/v1/threads/'+id+'/read-all'); return data; }
`],
  ['src/lib/api/messages.ts', `import axios from '@/app/api/axios-instance';
export async function fetchMessages(threadId?:string, applicationId?:string){
  const params:any = {}; if (threadId) params.threadId = threadId; if (applicationId) params.applicationId = applicationId;
  const { data } = await axios.get('/v1/messages', { params }); return data;
}
export async function sendMessage(payload:{ threadId?:string; applicationId?:string; text:string }){ const { data } = await axios.post('/v1/messages', payload); return data; }
`],
  ['src/lib/api/notifications.ts', `import axios from '@/app/api/axios-instance';
export async function fetchNotifications(params?:any){ const { data } = await axios.get('/v1/notifications', { params }); return data; }
export async function readNotification(id:string){ const { data } = await axios.patch('/v1/notifications/'+id+'/read'); return data; }
export async function deleteNotification(id:string){ const { data } = await axios.delete('/v1/notifications/'+id); return data; }
`],
  ['src/components/messaging/ThreadList.tsx', `"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { fetchThreads } from "@/lib/api/threads";
export default function ThreadList(){
  const { data, isLoading, isError } = useQuery({ queryKey: ["threads"], queryFn: () => fetchThreads({ page: 1 }), refetchInterval: 15000 });
  if (isLoading) return <div>در حال بارگذاری گفتگوها…</div>;
  if (isError) return <div>خطا در دریافت گفتگوها</div>;
  const items = (data?.items ?? data ?? []) as any[];
  return <div className="space-y-2">
    {items.length===0 && <div>گفتگویی ندارید.</div>}
    {items.map((t:any)=>(
      <Link key={t.id||t._id} href={'/inbox/'+(t.id||t._id)} className="block rounded-xl p-4 border hover:bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="font-medium">{t.title ?? t.jobTitle ?? "بدون عنوان"}</div>
          {t.unreadCount>0 && <span className="text-xs rounded-full px-2 py-0.5 bg-black text-white">{t.unreadCount}</span>}
        </div>
        <div className="text-sm text-gray-500 line-clamp-1">{t.lastMessage?.text ?? "—"}</div>
      </Link>
    ))}
  </div>;
}
`],
  ['src/components/messaging/ChatWindow.tsx', `"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchMessages, sendMessage } from "@/lib/api/messages";
import { markThreadReadAll } from "@/lib/api/threads";
import { getSocket } from "@/lib/socket";
export default function ChatWindow({ threadId, token }:{ threadId:string; token?:string }){
  const qc = useQueryClient();
  const listRef = useRef<HTMLDivElement|null>(null);
  const [text,setText] = useState('');
  const { data, isLoading } = useQuery({ queryKey: ["messages", threadId], queryFn: ()=>fetchMessages(threadId), refetchInterval: 10000 });
  const sendMut = useMutation({ mutationFn: (t:string)=>sendMessage({ threadId, text:t }), onSuccess: ()=>qc.invalidateQueries({ queryKey:["messages",threadId] }) });
  useEffect(()=>{ const s = getSocket(token); if(!s) return;
    const onNew=(p:any)=>{ if(p?.threadId===threadId){ qc.invalidateQueries({ queryKey:["messages",threadId] }); } };
    s.on('message:new', onNew); return ()=>{ s.off('message:new', onNew); };
  },[token, threadId, qc]);
  useEffect(()=>{ listRef.current?.scrollTo({ top: (listRef.current as HTMLDivElement).scrollHeight, behavior:'smooth' }); },[data]);
  useEffect(()=>{ markThreadReadAll(threadId).catch(()=>{}); },[threadId]);
  const items = useMemo(()=> (data?.items ?? data ?? []) as any[], [data]);
  if (isLoading) return <div>در حال بارگذاری پیام‌ها…</div>;
  return <div className="flex flex-col h-[70vh] border rounded-xl overflow-hidden">
    <div ref={listRef} className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-50">
      {items.map((m:any)=>(
        <div key={m.id||m._id} className={\`max-w-[75%] p-2 rounded-xl \${m.isMine?'bg-black text-white ml-auto':'bg-white border'}\`}>
          <div className="text-sm whitespace-pre-wrap">{m.text}</div>
          <div className="text-[10px] opacity-60 mt-1">{new Date(m.createdAt).toLocaleString()}</div>
        </div>
      ))}
      {items.length===0 && <div className="text-center text-sm text-gray-500">پیامی وجود ندارد.</div>}
    </div>
    <div className="flex gap-2 p-2 border-t bg-white">
      <input className="flex-1 rounded-xl border px-3 py-2" placeholder="پیام…" value={text}
        onChange={(e)=>setText(e.target.value)}
        onKeyDown={(e)=>{ if(e.key==='Enter' && text.trim()){ sendMut.mutate(text.trim()); setText(''); } }}
      />
      <button className="px-4 py-2 border rounded-xl" onClick={()=>{ if(text.trim()){ sendMut.mutate(text.trim()); setText(''); } }}>ارسال</button>
    </div>
  </div>;
}
`],
  ['src/app/inbox/page.tsx', `import ThreadList from "@/components/messaging/ThreadList";
export default function InboxPage(){
  return <div className="max-w-3xl mx-auto p-4 space-y-4">
    <h1 className="text-xl font-bold">گفتگوها</h1>
    <ThreadList />
  </div>;
}
`],
  ['src/app/inbox/[threadId]/page.tsx', `"use client";
import { useParams } from "next/navigation";
import ChatWindow from "@/components/messaging/ChatWindow";
function useToken(){ if(typeof window==='undefined') return undefined; return localStorage.getItem('token') ?? undefined; }
export default function ThreadPage(){
  const params = useParams();
  const threadId = String(params?.threadId ?? '');
  const token = useToken();
  return <div className="max-w-3xl mx-auto p-4 space-y-4">
    <h1 className="text-xl font-bold">چت</h1>
    <ChatWindow threadId={threadId} token={token} />
  </div>;
}
`],
  ['src/app/notifications/page.tsx', `"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchNotifications, readNotification, deleteNotification } from "@/lib/api/notifications";
export default function NotificationsPage(){
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["notifications"], queryFn: ()=>fetchNotifications({ limit: 100 }), refetchInterval: 20000 });
  const markRead = useMutation({ mutationFn: (id:string)=>readNotification(id), onSuccess:()=>qc.invalidateQueries({ queryKey:["notifications"] }) });
  const remove = useMutation({ mutationFn: (id:string)=>deleteNotification(id), onSuccess:()=>qc.invalidateQueries({ queryKey:["notifications"] }) });
  if (isLoading) return <div>در حال دریافت نوتیفیکیشن‌ها…</div>;
  const items = (data?.items ?? data ?? []) as any[];
  return <div className="max-w-2xl mx-auto p-4 space-y-4">
    <h1 className="text-xl font-bold">نوتیفیکیشن‌ها</h1>
    <div className="space-y-2">
      {items.length===0 && <div>چیزی ندارید.</div>}
      {items.map((n:any)=>(
        <div key={n.id||n._id} className="border rounded-xl p-3 flex items-center justify-between">
          <div><div className="font-medium">{n.title ?? "اعلان"}</div><div className="text-sm text-gray-600">{n.body ?? "—"}</div></div>
          <div className="flex items-center gap-2">
            {!n.read && <button className="text-xs border rounded px-2 py-1" onClick={()=>markRead.mutate(n.id||n._id)}>خواندم</button>}
            <button className="text-xs border rounded px-2 py-1" onClick={()=>remove.mutate(n.id||n._id)}>حذف</button>
          </div>
        </div>
      ))}
    </div>
  </div>;
}
`],
]);

for (const [p, c] of files.entries()) {
  const full = p;
  // No-op here; content will be written by consumer project
}

