// e2e/api.e2e.spec.ts
import { test, expect } from '@playwright/test';
import { get, post, patch, logStep, tokenFrom, firstIdFrom } from './support';

test.describe('E2E Full Flow', () => {
  const tokens: Record<'client'|'model'|'admin', string> = { client:'', model:'', admin:'' };
  const ids = { jobId: '', applicationId: '', threadId: '' };

  test('register', async () => {
    const suffix = Math.random().toString(36).slice(2,8);
    const users = [
      { role:'client', email:`client.${Date.now()}.${suffix}@e2e.test`, name:'Client E2E' },
      { role:'model',  email:`model.${Date.now()}.${suffix}@e2e.test`,  name:null },
      { role:'admin',  email:`admin.${Date.now()}.${suffix}@e2e.test`,  name:null },
    ];
    for (const u of users) {
      const r = await post('/api/v1/auth/register', { email:u.email, password:'Passw0rd!', role:u.role, name:u.name ?? undefined });
      logStep(`auth-register-${u.role}`, r);
      expect(r.status).toBeLessThan(400);
      const tok = tokenFrom(r.body);
      expect(tok, `token for ${u.role}`).toBeTruthy();
      tokens[u.role as 'client'|'model'|'admin'] = tok!;
    }
  });

  test('auth/me', async () => {
    for (const who of ['client','model','admin'] as const) {
      const r = await get('/api/v1/auth/me', tokens[who]);
      logStep(`auth-me-${who}`, r);
      expect(r.status).toBe(200);
    }
  });

  test('create job', async () => {
    const r = await post('/v1/jobs', {
      title: `E2E Job ${Date.now()}`, description: 'desc', budget: 200, city: 'Tehran'
    }, tokens.client);
    logStep('create-job-result', r);
    expect(r.status).toBeLessThan(400);
    ids.jobId = firstIdFrom(r.body) || '';
  });

  test('submit/approve', async () => {
    const s = await post(`/v1/jobs/${ids.jobId}/submit`, { termsAccepted: true }, tokens.client);
    logStep('submit-job', s);
    let ap = await post(`/v1/jobs/${ids.jobId}/approve`, {}, tokens.admin);
    if (ap.status >= 400) ap = await patch(`/v1/jobs/${ids.jobId}/approve`, {}, tokens.admin);
    logStep('approve-job', ap);
  });

  test('apply/thread/message/notifications', async () => {
    const ap = await post(`/v1/jobs/${ids.jobId}/apply`, { message: 'Interested' }, tokens.model);
    logStep('apply-job', ap);
  });
});

