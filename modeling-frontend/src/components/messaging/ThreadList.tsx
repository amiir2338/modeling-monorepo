'use client';
import React, { useEffect, useState } from "react";
import { listThreads, ThreadDTO } from "@/lib/api/threads";

export default function ThreadList() {
  const [threads, setThreads] = useState<ThreadDTO[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const res = await listThreads({ page: 1, limit: 10 });
        setThreads(res.data);
      } catch (err) {
        console.error("Failed to fetch threads", err);
      }
    }
    load();
  }, []);

  return (
    <div>
      <h2>لیست گفتگوها</h2>
      <ul>
        {threads.map((t: ThreadDTO) => (
          <li key={t._id}>
            {t._id} — {t.participants.join(", ")}
          </li>
        ))}
      </ul>
    </div>
  );
}

