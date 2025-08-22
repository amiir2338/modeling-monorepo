"use client";
import { useState } from "react";
import axios from "../api/axios-instance";
export default function ResetPasswordPage(){
  const [email,setEmail]=useState(""); const [newPassword,setNewPassword]=useState(""); const [msg,setMsg]=useState<string>("");
  const submit=async(e:React.FormEvent)=>{ e.preventDefault(); setMsg("در حال ارسال..."); try{ const res=await axios.post("/v1/auth/reset-password",{email,newPassword}); setMsg(res.data?.ok?"رمز عبور تغییر کرد":"ناموفق: "+JSON.stringify(res.data)); }catch(e:any){ setMsg(e?.response?.data?.message||e.message||"خطا"); } };
  return (<div style={{maxWidth:480,margin:"2rem auto"}}><h1>بازیابی رمز عبور</h1><form onSubmit={submit} style={{display:"grid",gap:"0.75rem"}}><input placeholder="ایمیل" value={email} onChange={e=>setEmail(e.target.value)} type="email" required/><input placeholder="رمز جدید" value={newPassword} onChange={e=>setNewPassword(e.target.value)} type="password" required/><button type="submit">تغییر رمز</button></form><p style={{marginTop:"1rem"}}>{msg}</p></div>); }
