'use client';
import React, { useState } from 'react';
import { useRouter } from'next/navigation' ;
import http from '@/lib/api/http';

type Role = 'client' | 'model' | 'admin';
type MeResponse = { ok: boolean; data?: { user?: { role?: Role } }; user?: { role?: Role }; message?: string };

function pickRole(r: MeResponse): Role | undefined {
  return (r?.data?.user?.role as Role) || (r?.user?.role as Role) || undefined;
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false); const [err, setErr] = useState<string|null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(null); setLoading(true);
    try {
      await http.post('/api/v1/auth/login', { email, password }, { withCredentials: true });
      const me = await http.get<MeResponse>('/api/v1/auth/me', { withCredentials: true });
      const role = pickRole(me.data);
      if (role === 'admin') router.replace('/dashboard/admin/jobs');
      else if (role === 'model') router.replace('/jobs');
      else router.replace('/dashboard/client/jobs');
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'ورود ناموفق بود.';
      setErr(msg);
    } finally { setLoading(false); }
  };

  return (
    <form onSubmit={submit} className="mx-auto max-w-md p-6 space-y-4">
      <h1 className="text-xl font-bold">ورود</h1>
      {err && <div className="bg-red-50 text-red-700 p-3 rounded-lg">{err}</div>}
      <input value={email} onChange={e=>setEmail(e.target.value)} type="email" placeholder="you@example.com" className="w-full border p-2 rounded"/>
      <input value={password} onChange={e=>setPassword(e.target.value)} type="password" placeholder="••••••" className="w-full border p-2 rounded"/>
  <button type="submit" data-testid="submit" disabled={loading} className="px-4 py-2 rounded bg-blue-600 text-white">{loading?'در حال ورود…':'ورود'}</button>
    </form>
  );
}
