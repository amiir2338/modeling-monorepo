import { spawn } from 'node:child_process';

function run(cmd,args){return new Promise((res,rej)=>{
  const p=spawn(cmd,args,{stdio:'inherit',shell:process.platform==='win32'});
  p.on('close',c=>c===0?res():rej(new Error(cmd+' exit '+c)));
});}

(async()=>{
 console.log('[E2E] API_BASE=',process.env.API_BASE||'http://localhost:4000/api');
 await run('npm',['init','-y']).catch(()=>{});
 await run('npm',['i','-D','@playwright/test@1.47.2']);
 await run('npx',['playwright','install','--with-deps']);
 await run('npx',['playwright','test','e2e/api.e2e.spec.ts']);
 await run('npx',['playwright','test','e2e/ui.e2e.spec.ts']);
})().catch(e=>{console.error(e);process.exit(1);});
