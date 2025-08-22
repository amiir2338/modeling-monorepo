"use client";
import { useEffect, useState } from "react";
import axios from "../../api/axios-instance";
export default function SeedCheckPage() {
  const [status, setStatus] = useState<string>("Loading...");
  useEffect(()=>{ (async()=>{
    try{
      const res = await axios.get("/health");
      if (res.data?.ok) setStatus("Backend is healthy. Try admin@example.com / 123456");
      else setStatus("Health check failed: " + JSON.stringify(res.data));
    }catch(e:any){ setStatus("Error: " + (e.message || String(e))); }
  })(); },[]);
  return (<div style={{padding:"2rem"}}><h1>Seed Check</h1><p>{status}</p></div>);
}
