import process from 'node:process';
const [,, apiBase, token]=process.argv;
if(!apiBase||!token){console.log('Usage: node e2e/quick-auth-check.mjs <API_BASE> <TOKEN>');process.exit(2);}
const url=apiBase.replace(/\/$/,'')+'/v1/auth/me';
(async()=>{
 const r=await fetch(url,{headers:{Authorization:'Bearer '+token,authorization:'Bearer '+token,'x-access-token':token}});
 const text=await r.text(); console.log('status=',r.status); console.log('body=',text);
})();
