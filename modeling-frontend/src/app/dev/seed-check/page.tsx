'use client';
import React, { useEffect, useState } from 'react';

interface PingOk { ok: true; msg: string }
interface PingErr { ok: false; message?: string }

export default function SeedCheck() {
  const [res, setRes] = useState<PingOk | PingErr | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const r = await fetch('/api/ping');
        const data = (await r.json()) as PingOk | PingErr;
        if (mounted) setRes(data);
      } catch {
        if (mounted) setRes({ ok: false, message: 'network error' });
      }
    })();
    return () => { mounted = false; };
  }, []);

  return <pre className="p-4">{JSON.stringify(res, null, 2)}</pre>;
}

