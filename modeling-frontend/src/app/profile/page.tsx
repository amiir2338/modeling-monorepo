"use client";
import { useEffect, useState } from "react";
import axios from "../api/axios-instance";

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:4000/api").replace(/\/+$/, "");
const FILE_BASE = API_BASE.replace(/\/api$/, "");

const toImgSrc = (p?: string | null) => {
  if (!p) return "";
  return /^https?:\/\//i.test(p) ? p : `${FILE_BASE}${p}`;
};

export default function ProfilePage(){
  const [user,setUser]=useState<any>(null);
  const [name,setName]=useState("");
  const [msg,setMsg]=useState<string>("");
  const [file,setFile]=useState<File|null>(null);

  useEffect(()=>{
    (async()=>{
      try{
        const res=await axios.get("/v1/auth/me");
        if(res.data?.ok){
          setUser(res.data.user);
          setName(res.data.user?.name||"");
        }
      }catch{}
    })();
  },[]);

  const upload=async()=>{
    if(!file) return;
    const fd=new FormData();
    fd.append("file",file);
    const res=await axios.post("/v1/upload",fd,{headers:{'Content-Type':'multipart/form-data'}});
    return res.data?.url;
  };

  const save=async(e:React.FormEvent)=>{
    e.preventDefault();
    setMsg("در حال ذخیره...");
    try{
      let avatar=user?.avatar||null;
      if(file){
        const url=await upload();
        if(url) avatar=/^https?:\/\//i.test(url)?url:`${FILE_BASE}${url}`;
      }
      const res=await axios.put("/v1/users/me",{name,avatar});
      if(res.data?.ok){
        setUser(res.data.user);
        setMsg("ذخیره شد");
      } else setMsg("ناموفق: "+JSON.stringify(res.data));
    }catch(e:any){
      setMsg(e?.response?.data?.message||e.message||"خطا");
    }
  };

  return (
    <div style={{maxWidth:520,margin:"2rem auto"}}>
      <h1>پروفایل من</h1>
      {user?(
        <form onSubmit={save} style={{display:"grid",gap:"0.75rem"}}>
          <div>
            {user.avatar?(
              <img src={toImgSrc(user.avatar)} alt="avatar" style={{width:96,height:96,objectFit:"cover",borderRadius:8}}/>
            ):(
              <div style={{width:96,height:96,background:"#eee"}}/>
            )}
          </div>
          <input placeholder="نام" value={name} onChange={e=>setName(e.target.value)}/>
          <input type="file" accept="image/*" onChange={e=>setFile(e.target.files?.[0]||null)}/>
          <button type="submit">ذخیره</button>
        </form>
      ):(
        <p>برای مشاهده پروفایل وارد شوید.</p>
      )}
      <p style={{marginTop:"1rem"}}>{msg}</p>
    </div>
  );
}
