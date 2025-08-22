"use client";
import { useState } from "react";
import axios from "../../../api/axios-instance";

export default function AdminJobsModeration(){
  const [jobId,setJobId]=useState("");
  const [note,setNote]=useState("");
  const [msg,setMsg]=useState("");
  const [busy,setBusy]=useState(false);

  const approve=async()=>{
    setMsg(""); setBusy(true);
    try{
      const res = await axios.post(`/v1/jobs/${jobId}/approve`, { note });
      setMsg(res.data?.ok? "تایید شد ✅" : (res.data?.message||"ناموفق"));
    }catch(e:any){ setMsg(e?.response?.data?.message||e.message); }
    finally{setBusy(false)}
  };

  const reject=async()=>{
    setMsg(""); setBusy(true);
    try{
      const res = await axios.post(`/v1/jobs/${jobId}/reject`, { reason: note||"Not a fit" });
      setMsg(res.data?.ok? "رد شد ❌" : (res.data?.message||"ناموفق"));
    }catch(e:any){ setMsg(e?.response?.data?.message||e.message); }
    finally{setBusy(false)}
  };

  return (
    <main className="max-w-xl mx-auto p-4 grid gap-4">
      <h1 className="text-xl font-bold">مدیریت آگهی‌ها (Admin)</h1>
      <div className="grid gap-2 border rounded-xl p-4">
        <input className="border p-2 rounded" placeholder="Job ID" value={jobId} onChange={e=>setJobId(e.target.value)} />
        <input className="border p-2 rounded" placeholder="یادداشت/دلیل (اختیاری)" value={note} onChange={e=>setNote(e.target.value)} />
        <div className="flex gap-2">
          <button disabled={busy||!jobId} onClick={approve} className="bg-green-600 text-white rounded px-3 py-2 disabled:opacity-50">Approve</button>
          <button disabled={busy||!jobId} onClick={reject} className="bg-red-600 text-white rounded px-3 py-2 disabled:opacity-50">Reject</button>
        </div>
        {msg && <p className="text-sm" style={{color: msg.includes("✅")?"green": msg.includes("❌")?"crimson":"#333"}}>{msg}</p>}
      </div>
    </main>
  );
}
