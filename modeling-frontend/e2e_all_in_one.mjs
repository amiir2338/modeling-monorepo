// e2e_all_in_one.mjs
// Node 18+ (global fetch). Run: node e2e_all_in_one.mjs

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// ===== Config =====
const API_BASE = process.env.API_BASE?.trim() || 'http://localhost:4000/api';
const V1 = `${API_BASE}/v1`;
const FRONT_BASE = process.env.FRONT_BASE?.trim() || 'http://localhost:3000';
const TS = Date.now();
const EMAIL = (prefix) => `${prefix}.e2e+${TS}@test.com`;

// ===== Helpers =====
function log(tag, data) {
  const t = new Date().toISOString();
  const out = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  console.log(`[${t}] [${tag}] ${out}`);
}

async function req(method, url, { body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch { /* non-JSON */ }
  const result = { ok: res.ok, status: res.status, url, method, body, json };
  if (res.ok) log('OK', { method, url, status: res.status });
  else log('FAIL', { method, url, status: res.status, json });
  return result;
}

const post  = (url, opts) => req('POST',  url, opts);
const get   = (url, opts) => req('GET',   url, opts);
const patch = (url, opts) => req('PATCH', url, opts);

function extractToken(j) {
  if (!j) return null;
  return j.token || j?.data?.token || null;
}
function extractId(obj) {
  if (!obj) return null;
  return obj._id || obj.id || null;
}
function assert(cond, msg, extra) {
  if (!cond) {
    const e = new Error(msg);
    e.extra = extra;
    throw e;
  }
}

async function main() {
  const report = {
    meta: { ts: TS, apiBase: API_BASE, frontBase: FRONT_BASE, node: process.version },
    steps: [],
    summary: {},
  };
  log('ENV', report.meta);

  // 0) Health
  {
    const r = await get(`${API_BASE}/ping`);
    report.steps.push({ name: 'ping', res: r });
    assert(r.ok && r.status === 200 && r.json?.ok, 'API /ping failed', r);
  }

  // 1) Auth: register three roles
  const client = { email: EMAIL('client'), password: 'Passw0rd!', role: 'client', name: 'Client E2E' };
  const model  = { email: EMAIL('model'),  password: 'Passw0rd!', role: 'model',  name: 'Model E2E'  };
  const admin  = { email: EMAIL('admin'),  password: 'Passw0rd!', role: 'admin',  name: 'Admin E2E'  };
  const tokens = { client: null, model: null, admin: null };

  for (const [label, body] of [['client', client], ['model', model], ['admin', admin]]) {
    log('REGISTER', { label, email: body.email, role: body.role });
    const r = await post(`${V1}/auth/register`, body);
    report.steps.push({ name: `register-${label}`, req: { url: `${V1}/auth/register`, body }, res: r });
    assert(r.ok && r.status === 201, `register ${label} failed`, r);
    const t = extractToken(r.json);
    assert(t, `no token for ${label} after register`, r.json);
    tokens[label] = t;
  }

  // 2) /auth/me for all
  for (const who of ['client', 'model', 'admin']) {
    const t = tokens[who];
    const r = await get(`${V1}/auth/me`, { token: t });
    report.steps.push({ name: `auth-me-${who}`, res: r });
    assert(r.ok && r.status === 200 && r.json?.ok, `/auth/me failed for ${who}`, r);
    log('ME', { who, data: r.json?.data });
  }

  // 3) Create Job (client)
  const jobBody = {
    title: `E2E Job ${TS}`,
    description: 'Created by E2E script',
    budget: 250,
    city: 'Tehran',
    date: new Date().toISOString(),
  };
  const createJobRes = await post(`${V1}/jobs`, { body: jobBody, token: tokens.client });
  report.steps.push({ name: 'job-create', req: { body: jobBody }, res: createJobRes });
  assert(createJobRes.ok && (createJobRes.status === 201 || createJobRes.status === 200), 'job create failed', createJobRes);
  const jobId =
    extractId(createJobRes.json?.job) ||
    extractId(createJobRes.json?.data?.job) ||
    extractId(createJobRes.json?.data) ||
    extractId(createJobRes.json);
  assert(jobId, 'no jobId in createJob response', createJobRes.json);
  log('JOB', { jobId });

  // 4) Submit Job (client)
  const submitRes = await post(`${V1}/jobs/${jobId}/submit`, {
    body: { termsAccepted: true },
    token: tokens.client,
  });
  report.steps.push({ name: 'job-submit', res: submitRes });
  assert(submitRes.ok && submitRes.json?.ok, 'job submit failed', submitRes);

  // 5) Approve Job (admin) — prefer PATCH, fallback to POST if needed
  let approveRes = await patch(`${V1}/jobs/${jobId}/approve`, { token: tokens.admin });
  if (!approveRes.ok && approveRes.status === 404) {
    approveRes = await post(`${V1}/jobs/${jobId}/approve`, { token: tokens.admin });
  }
  report.steps.push({ name: 'job-approve', res: approveRes });
  assert(approveRes.ok && approveRes.json?.ok, 'job approve failed', approveRes);

  // 6) Model applies to job
  const applyRes = await post(`${V1}/jobs/${jobId}/apply`, {
    body: { message: 'Hi, I am interested (E2E).' },
    token: tokens.model,
  });
  report.steps.push({ name: 'job-apply', res: applyRes });
  assert(applyRes.ok, 'apply failed', applyRes);
  const applicationId =
    extractId(applyRes.json?.application) ||
    extractId(applyRes.json?.data) ||
    extractId(applyRes.json);
  assert(applicationId, 'no applicationId', applyRes.json);
  log('APPLY', { applicationId });

  // 7) Ensure thread by application (model)
  const ensureThreadRes = await post(`${V1}/threads/by-application`, {
    body: { applicationId },
    token: tokens.model,
  });
  report.steps.push({ name: 'thread-ensure', res: ensureThreadRes });
  assert(ensureThreadRes.ok, 'ensure thread failed', ensureThreadRes);
  const threadId =
    extractId(ensureThreadRes.json?.thread) ||
    extractId(ensureThreadRes.json?.data) ||
    extractId(ensureThreadRes.json);
  assert(threadId, 'no threadId', ensureThreadRes.json);
  log('THREAD', { threadId });

  // 8) Model sends message in thread
  const msgText = `Hello from E2E ${TS}`;
  const sendMsgRes = await post(`${V1}/messages`, {
    body: { threadId, text: msgText },
    token: tokens.model,
  });
  report.steps.push({ name: 'message-send', res: sendMsgRes });
  assert(sendMsgRes.ok, 'send message failed', sendMsgRes);

  // 9) Client notifications
  const notifRes = await get(`${V1}/notifications`, { token: tokens.client });
  report.steps.push({ name: 'notifications', res: notifRes });
  assert(notifRes.ok, 'notifications failed', notifRes);

  // Summary
  report.summary = {
    ok: true,
    users: { client: client.email, model: model.email, admin: admin.email },
    jobId,
    applicationId,
    threadId,
    lastMessage: msgText,
    notificationsCount: notifRes.json?.items?.length ?? null,
  };
  log('SUMMARY', report.summary);

  // Save report
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const out = path.join(__dirname, `e2e-report-${TS}.json`);
  await fs.writeFile(out, JSON.stringify(report, null, 2), 'utf-8');
  log('REPORT-SAVED', { file: out });
}

// ---- Run with proper try/catch wrapper ----
(async () => {
  try {
    await main();
  } catch (err) {
    const fail = {
      ok: false,
      message: err?.message || String(err),
      extra: err?.extra || null,
    };
    log('E2E-ERROR', fail);
    try {
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      const out = path.join(__dirname, `e2e-report-error-${TS}.json`);
      await fs.writeFile(out, JSON.stringify(fail, null, 2), 'utf-8');
      log('REPORT-SAVED', { file: out });
    } catch {}
    process.exit(1);
  }
})();
