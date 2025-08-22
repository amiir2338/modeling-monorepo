"use client";
import { useEffect, useState } from "react";
import axios from "../../../api/axios-instance";

export default function ClientJobsPage(){
  const [jobs,setJobs]=useState<any[]>([]);
  const [loading,setLoading]=useState(true);
  const [err,setErr]=useState<string>("");

  useEffect(()=>{
    (async()=>{
      try{
        const res = await axios.get("/v1/jobs/my");
        const data = res.data?.jobs || res.data?.data || res.data || [];
        setJobs(Array.isArray(data)?data:[]);
      }catch(e:any){
        setErr(e?.response?.data?.message||e.message||"خطا در خواندن آگهی‌های شما");
      }finally{setLoading(false)}
    })();
  },[]);

  return (
    <main className="max-w-4xl mx-auto p-4 grid gap-4">
      <h1 className="text-xl font-bold">آگهی‌های من (Client)</h1>
      {loading? <p>در حال بارگذاری…</p> : err? <p className="text-red-600">{err}</p> : (
        <div className="grid gap-3">
          {jobs.length===0 && <p>هنوز آگهی‌ای نساخته‌اید.</p>}
          {jobs.map((j:any)=> (
            <div key={j._id} className="border rounded-xl p-4">
              <div className="font-semibold">{j.title}</div>
              <div className="text-sm opacity-70">وضعیت: {j.status}</div>
              <div className="text-sm opacity-70">بودجه: {j.budget??"—"} • شهر: {j.city||"—"}</div>
              <a href={`/jobs/${j._id}`} className="text-blue-600 text-sm underline mt-1 inline-block">مشاهده</a>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
