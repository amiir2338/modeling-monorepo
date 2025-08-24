import { test, expect } from '@playwright/test';
import { get, post, patch, randEmail, extractToken, firstIdFrom, decodeJwtPayload, logStep } from './helpers';

test.describe('E2E Full Flow',()=>{
  const password='Passw0rd!';
  const emails={client:randEmail('client'), model:randEmail('model'), admin:randEmail('admin')};
  let tokens={client:'',model:'',admin:''};
  let ids={clientId:'',jobId:'',applicationId:'',threadId:''};

  test('register', async()=>{
    const c=await post('/v1/auth/register',{email:emails.client,password,role:'client',name:'Client E2E'});
    logStep('auth-register-client',c);
    expect(c.status).toBeLessThan(400);
    tokens.client=extractToken(c.body); ids.clientId=c.body?.data?.clientId||c.body?.clientId||'';

    const m=await post('/v1/auth/register',{email:emails.model,password,role:'model'});
    logStep('auth-register-model',m); tokens.model=extractToken(m.body);

    const a=await post('/v1/auth/register',{email:emails.admin,password,role:'admin'});
    logStep('auth-register-admin',a); tokens.admin=extractToken(a.body);
  });

  test('auth/me', async()=>{
    for(const who of ['client','model','admin']){
      const r=await get('/v1/auth/me',tokens[who]);
      logStep(`auth-me-${who}`,r);
      expect(r.status).toBe(200);
    }
  });

  test('create job', async()=>{
    let r=await post('/v1/jobs',{title:'E2E Job',description:'by e2e',budget:100,city:'Tehran'},tokens.client);
    if(r.status>=400){logStep('create-job-client-failed',r);
      r=await post('/v1/jobs',{title:'E2E Job',description:'by e2e',budget:100,city:'Tehran',clientId:ids.clientId},tokens.admin);
    }
    logStep('create-job-result',r);
    expect(r.status).toBeLessThan(400);
    ids.jobId=firstIdFrom(r.body);
  });

  test('submit/approve', async()=>{
    const s=await post(`/v1/jobs/${ids.jobId}/submit`,{termsAccepted:true},tokens.client);
    logStep('submit-job',s);
    expect(s.status).toBeLessThan(400);
    let ap=await post(`/v1/jobs/${ids.jobId}/approve`,{},tokens.admin);
    if(ap.status>=400){logStep('approve-post-failed',ap); ap=await patch(`/v1/jobs/${ids.jobId}/approve`,{},tokens.admin);}
    logStep('approve-job',ap); expect(ap.status).toBeLessThan(400);
  });

  test('apply/thread/message/notifications', async()=>{
    const ap=await post(`/v1/jobs/${ids.jobId}/apply`,{message:'I am interested.'},tokens.model);
    logStep('apply-job',ap); ids.applicationId=firstIdFrom(ap.body);
    const th=await post('/v1/threads/by-application',{applicationId:ids.applicationId},tokens.model);
    logStep('thread-by-application',th); ids.threadId=firstIdFrom(th.body);
    const ms=await post('/v1/messages',{threadId:ids.threadId,text:'Hello from E2E'},tokens.model);
    logStep('send-message',ms);
    const nf=await get('/v1/notifications',tokens.client);
    logStep('notifications',nf);
  });
});
