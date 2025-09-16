// Run with: node e2e/full-check.mjs
// ENV override: API_BASE, FRONT_BASE
const API_BASE = process.env.API_BASE || 'http://localhost:4000/api';
const FRONT_BASE = process.env.FRONT_BASE || 'http://localhost:3000';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ts = Date.now();
const rand = () => Math.random().toString(36).slice(2, 8);
const emails = {
  client: `client.${ts}.${rand()}@e2e.test`,
  model:  `model.${ts}.${rand()}@e2e.test`,
  admin:  `admin.${ts}.${rand()}@e2e.test`,
};
const passwords = {
  client: 'Passw0rd!',
  model:  'Passw0rd!',
  admin:  'Passw0rd!',
};

function headers(token) {
  const h = { 'Content-Type': 'application/json' };
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

async function http(method, urlOrPath, body, token) {
  const url = urlOrPath.startsWith('http') ? urlOrPath : `${API_BASE}${urlOrPath}`;
  const init = { method, headers: headers(token) };
  if (body !== undefined) init.body = JSON.stringify(body);
  let res, text;
  try {
    res = await fetch(url, init);
    text = await res.text();
  } catch (e) {
    return { status: 0, body: { ok: false, error: String(e) }, raw: '' };
  }
  let json;
  try { json = text ? JSON.parse(text) : {}; } catch { json = {}; }
  return { status: res.status, body: json, raw: text };
}
const get   = (u, t)     => http('GET', u, undefined, t);
const post  = (u, b, t)  => http('POST', u, b, t);
const patch = (u, b, t)  => http('PATCH', u, b, t);
const del   = (u, t)     => http('DELETE', u, undefined, t);

function firstIdFrom(b) {
  const idOf = (o) => (o?._id || o?.id || null);
  return idOf(b?.job) || idOf(b?.data?.job) || idOf(b?.data?.application) || idOf(b?.data?.thread) || idOf(b?.data) || idOf(b);
}
function log(tag, info) {
  const pretty = (() => {
    try { return JSON.stringify(info, null, 2); } catch { return String(info); }
  })();
  console.log(`[${new Date().toISOString()}] [${tag}] ${pretty}`);
}

async function assertOk(cond, msg, dump) {
  if (!cond) {
    if (dump) log('FAIL-DUMP', dump);
    throw new Error(msg);
  }
}

async function pingChecks() {
  const api = await get('/ping');
  log('api/ping', api);
  await assertOk(api.status === 200 && api.body?.ok === true, 'API ping failed', api);

  // Front might be off; only warn if down
  let front;
  try {
    front = await fetch(`${FRONT_BASE}`, { method: 'GET' });
    log('front/ping', { status: front.status });
  } catch (e) {
    log('front/ping', { error: String(e) });
  }
}

async function registerAll() {
  const out = {};
  // client
  const rc = await post('/v1/auth/register', { email: emails.client, password: passwords.client, role: 'client', name: 'Client E2E' });
  log('auth-register-client', rc);
  await assertOk(rc.status < 400 && rc.body?.data?.token, 'Register client failed', rc);
  out.client = rc.body.data.token;

  // model
  const rm = await post('/v1/auth/register', { email: emails.model, password: passwords.model, role: 'model' });
  log('auth-register-model', rm);
  await assertOk(rm.status < 400 && rm.body?.data?.token, 'Register model failed', rm);
  out.model = rm.body.data.token;

  // admin
  const ra = await post('/v1/auth/register', { email: emails.admin, password: passwords.admin, role: 'admin' });
  log('auth-register-admin', ra);
  await assertOk(ra.status < 400 && ra.body?.data?.token, 'Register admin failed', ra);
  out.admin = ra.body.data.token;

  return out;
}

async function authMeAll(tokens) {
  for (const who of ['client', 'model', 'admin']) {
    const r = await get('/v1/auth/me', tokens[who]);
    log(`auth-me-${who}`, r);
    await assertOk(r.status === 200 && r.body?.ok === true, `/auth/me failed for ${who}`, r);
  }
}

async function createSubmitApprove(tokens) {
  // create job
  const cj = await post('/v1/jobs', {
    title: `E2E Job ${ts}`,
    description: 'desc',
    budget: 200,
    city: 'Tehran',
  }, tokens.client);
  log('create-job-result', cj);
  await assertOk(cj.status < 400 && cj.body?.job?._id, 'Create job failed', cj);
  const jobId = cj.body.job._id;

  // submit
  let s = await post(`/v1/jobs/${jobId}/submit`, { termsAccepted: true }, tokens.client);
  if (s.status === 404) {
    // fallback to PATCH if your backend uses PATCH
    s = await patch(`/v1/jobs/${jobId}/submit`, { termsAccepted: true }, tokens.client);
  }
  log('submit-job', s);
  await assertOk(s.status < 400, 'Submit job failed', s);

  // approve (admin)
  let ap = await post(`/v1/jobs/${jobId}/approve`, {}, tokens.admin);
  if (ap.status >= 400) {
    log('approve-post-failed', ap);
    ap = await patch(`/v1/jobs/${jobId}/approve`, {}, tokens.admin);
  }
  log('approve-job', ap);
  await assertOk(ap.status < 400, 'Approve job failed', ap);

  return jobId;
}

async function applyThreadMessage(tokens, jobId) {
  // model applies
  const app = await post(`/v1/jobs/${jobId}/apply`, { message: 'Interested' }, tokens.model);
  log('apply-job', app);
  await assertOk(app.status < 400 && app.body?.application?._id, 'Apply failed', app);
  const applicationId = app.body.application._id;

  // ensure thread by application
  const thr = await post('/v1/threads/by-application', { applicationId }, tokens.model);
  log('thread-by-application', thr);
  await assertOk(thr.status < 400, 'Ensure thread failed', thr);
  const threadId =
    thr.body?.thread?._id ||
    thr.body?.data?.thread?._id ||
    firstIdFrom(thr.body);

  await assertOk(!!threadId, 'No threadId found in response', thr);

  // model -> client message
  const m1 = await post('/v1/messages', { threadId, text: `hello m2c ${ts}` }, tokens.model);
  log('send-message-m2c', m1);
  await assertOk(m1.status < 400, 'Send message (model) failed', m1);

  // client -> model message
  const m2 = await post('/v1/messages', { threadId, text: `hello c2m ${ts}` }, tokens.client);
  log('send-message-c2m', m2);
  await assertOk(m2.status < 400, 'Send message (client) failed', m2);

  // notifications
  const nC = await get('/v1/notifications', tokens.client);
  const nM = await get('/v1/notifications', tokens.model);
  log('notifications-client', nC);
  log('notifications-model', nM);

  return { applicationId, threadId };
}

async function frontSmoke(threadId) {
  // /auth/login should contain an email input (SSR HTML check)
  try {
    const r = await fetch(`${FRONT_BASE}/auth/login`);
    const html = await r.text();
    log('front-auth-login', { status: r.status, foundEmailInput: /type="email"/i.test(html) });
  } catch (e) {
    log('front-auth-login', { error: String(e) });
  }

  // OTP page existence (just SSR)
  try {
    const r = await fetch(`${FRONT_BASE}/auth/otp?phone=+98912****`);
    log('front-auth-otp', { status: r.status });
  } catch (e) {
    log('front-auth-otp', { error: String(e) });
  }

  // inbox thread page (SSR reachability)
  if (threadId) {
    try {
      const r = await fetch(`${FRONT_BASE}/inbox/${threadId}`);
      log('front-inbox-thread', { status: r.status });
    } catch (e) {
      log('front-inbox-thread', { error: String(e) });
    }
  }
}

(async () => {
  console.log('=== FULL CHECK START ===');
  console.log('API_BASE  =', API_BASE);
  console.log('FRONT_BASE=', FRONT_BASE);
  console.log('emails    =', emails);
  console.log('------------------------');

  await pingChecks();

  const tokens = await registerAll();
  await authMeAll(tokens);

  const jobId = await createSubmitApprove(tokens);
  const { applicationId, threadId } = await applyThreadMessage(tokens, jobId);

  await frontSmoke(threadId);

  console.log('------------------------');
  console.log('SUMMARY:', {
    users: emails,
    tokens: Object.fromEntries(Object.entries(tokens).map(([k, v]) => [k, v?.slice(0, 16) + '…'])),
    ids: { jobId, applicationId, threadId },
  });
  console.log('=== FULL CHECK DONE ✓ ===');
})().catch((e) => {
  console.error('❌ FAILED:', e.message);
  process.exitCode = 1;
});
