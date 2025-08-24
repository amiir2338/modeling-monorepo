// e2e/helpers.ts
export const API_BASE = process.env.API_BASE || 'http://localhost:4000/api';
export const FRONT_BASE = process.env.FRONT_BASE || 'http://localhost:3000';

function headersWithToken(token){
  const h={ 'Content-Type':'application/json' };
  if(token){
    h['Authorization'] = `Bearer ${token}`;
    h['authorization'] = `Bearer ${token}`;
    h['x-access-token'] = token;
  }
  return h;
}

export async function http(method,url,body,token){
  const headers=headersWithToken(token);
  const full = `${API_BASE}${url}`;
  let res,text='';
  try{
    res=await fetch(full,{method,headers,body: body?JSON.stringify(body):undefined});
    try{text=await res.text();}catch{}
    let parsed=null; try{parsed=text?JSON.parse(text):null;}catch{}
    return {status:res.status, body:parsed??{}, raw:text};
  }catch(e){return {status:0, body:{ok:false,error:String(e)}, raw:''};}
}

export const get=(u,t)=>http('GET',u,undefined,t);
export const post=(u,b,t)=>http('POST',u,b,t);
export const patch=(u,b,t)=>http('PATCH',u,b,t);

export function randEmail(prefix){const ts=Date.now();const r=Math.random().toString(36).slice(2,8);return `${prefix}.${ts}.${r}@e2e.test`;}

export function extractToken(b){return b?.token||b?.data?.token;}
export function extractId(o){return o?._id||o?.id;}
export function firstIdFrom(b){return extractId(b?.job)||extractId(b?.data?.job)||extractId(b?.data)||extractId(b);}

export function decodeJwtPayload(token){
 try{
  const base64Url=token.split('.')[1];
  const base64=base64Url.replace(/-/g,'+').replace(/_/g,'/').padEnd(Math.ceil(base64Url.length/4)*4,'=');
  const json=Buffer.from(base64,'base64').toString('utf-8');
  return JSON.parse(json);
 }catch{return null;}
}

export function logStep(tag,info){
 const stamp=new Date().toISOString();
 console.log(`[${stamp}] [${tag}]`, typeof info==='string'?info:JSON.stringify(info));
}
