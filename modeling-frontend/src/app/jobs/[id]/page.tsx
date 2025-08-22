"use client";
import { useEffect, useState } from "react";
import axios from "../../api/axios-instance";
import { useParams, useRouter } from "next/navigation";

export default function JobDetailPage(){
  const params = useParams();
  const id = String(params?.id||"");
  const router = useRouter();

  const [job,setJob]=useState<any>(null);
  const [loading,setLoading]=useState(true);
  const [err,setErr]=useState<string>("");
  const [message,setMessage]=useState("");
  const [portfolio,setPortfolio]=useState("");
  const [applyMsg,setApplyMsg]=useState<string>("");
  const [applyBusy,setApplyBusy]=useState(false);

  useEffect(()=>{
    (async()=>{
      try{
        const res = await axios.get(`/v1/jobs/${id}`);
        const data = (res.data && res.data.job) ? res.data.job : res.data;
        setJob(data);
      }catch(e:any){
        setErr(e?.response?.data?.message||e.message||"خطا در دریافت آگهی");
      }finally{setLoading(false)}
    })();
  },[id]);

  const apply = async(e:React.FormEvent)=>{
    e.preventDefault();
    setApplyMsg(""); setApplyBusy(true);
    try{
      const res = await axios.post(`/v1/jobs/${id}/apply`, { message, portfolio });
      if(res.data?.ok){
        setApplyMsg("درخواست شما ثبت شد ✅");
      } else {
        setApplyMsg(res.data?.message||"درخواست ثبت نشد");
      }
    }catch(e:any){
      const m = e?.response?.data?.message || e.message;
      setApplyMsg(m);
    }finally{setApplyBusy(false)}
  };

  if(loading) return <p className="p-4">در حال بارگذاری…</p>;
  if(err) return <p className="p-4 text-red-600">{err}</p>;
  if(!job) return <p className="p-4">یافت نشد.</p>;

  return (
    <main className="max-w-3xl mx-auto p-4 grid gap-6">
      <button onClick={()=>router.back()} className="text-sm opacity-70 hover:opacity-100">← برگشت</button>
      <header>
        <h1 className="text-2xl font-bold">{job.title}</h1>
        <div className="text-sm opacity-70 mt-1">{job.city} • {job.budget?`بودجه ${job.budget}`:"بدون بودجه"} • وضعیت: {job.status}</div>
      </header>

      <article className="prose max-w-none">
        <p>{job.description}</p>
      </article>

      {job.status!=="approved" ? (
        <div className="p-3 rounded bg-yellow-50 border">این آگهی هنوز برای اپلای باز نیست.</div>
      ) : (
        <form onSubmit={apply} className="grid gap-3 border rounded-xl p-4">
          <h3 className="font-semibold">درخواست همکاری (Model)</h3>
          <input className="border p-2 rounded" placeholder="لینک نمونه‌کار (اختیاری)" value={portfolio} onChange={e=>setPortfolio(e.target.value)} />
          <textarea className="border p-2 rounded" placeholder="پیام شما" value={message} onChange={e=>setMessage(e.target.value)} />
          <button disabled={applyBusy} className="bg-black text-white rounded-lg px-4 py-2 disabled:opacity-50">{applyBusy?"در حال ارسال…":"ارسال درخواست"}</button>
          {applyMsg && <p className="text-sm mt-1" style={{color: applyMsg.includes("✅")?"green":"crimson"}}>{applyMsg}</p>}
        </form>
      )}
    </main>
  );
}
