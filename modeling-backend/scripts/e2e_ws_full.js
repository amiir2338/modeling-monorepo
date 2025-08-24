// scripts/e2e_ws_full.js
// End-to-End: Register/Login -> Create/Approve Job -> Apply -> Thread -> WebSocket Messaging
// Requires: npm i axios socket.io-client
import axios from 'axios';
import { io } from 'socket.io-client';

// ========================== Config ==========================
const API_BASE = process.env.API_BASE || 'http://localhost:4000/api';
const WS_BASE = process.env.WS_BASE || 'http://localhost:4000';
const PWD = 'secret123';

// ========================== Helpers ==========================
const api = axios.create({ baseURL: API_BASE, timeout: 15000 });

function randEmail(prefix) {
  const n = Math.floor(10000 + Math.random() * 90000);
  return `${prefix}${n}@example.com`;
}
async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function post(url, body, token) {
  try {
    const res = await api.post(url, body, token ? { headers: { Authorization: `Bearer ${token}` } } : undefined);
    return res.data;
  } catch (e) {
    const msg = e?.response?.data || e?.message;
    console.error('POST', url, 'ERROR ->', msg);
    throw e;
  }
}
async function patch(url, body, token) {
  try {
    const res = await api.patch(url, body, { headers: { Authorization: `Bearer ${token}` } });
    return res.data;
  } catch (e) {
    const msg = e?.response?.data || e?.message;
    console.error('PATCH', url, 'ERROR ->', msg);
    throw e;
  }
}
async function get(url, token) {
  try {
    const res = await api.get(url, token ? { headers: { Authorization: `Bearer ${token}` } } : undefined);
    return res.data;
  } catch (e) {
    const msg = e?.response?.data || e?.message;
    console.error('GET', url, 'ERROR ->', msg);
    throw e;
  }
}

// ========================== Main Flow ==========================
(async () => {
  console.log('\n=== E2E: WS Messaging Flow ===');

  // 0) Health
  console.log('\n[0] Health check...');
  const health = await get('/health');
  if (!health?.ok) throw new Error('Health not ok');
  console.log('  ✔ Health OK');

  // 1) Register 3 roles
  console.log('\n[1] Register users (client/model/admin)...');
  const emailClient = randEmail('client');
  const emailModel  = randEmail('model');
  const emailAdmin  = randEmail('admin');

  const regClient = await post('/v1/auth/register', { email: emailClient, password: PWD, name: 'Client', role: 'client' });
  const regModel  = await post('/v1/auth/register', { email: emailModel,  password: PWD, name: 'Model',  role: 'model'  });
  const regAdmin  = await post('/v1/auth/register', { email: emailAdmin,  password: PWD, name: 'Admin',  role: 'admin'  });

  const tokClient = regClient.token;
  const tokModel  = regModel.token;
  const tokAdmin  = regAdmin.token;
  if (!tokClient || !tokModel || !tokAdmin) throw new Error('Missing tokens');

  console.log('  ✔ Registered & tokens acquired');

  // 2) Create Job -> set date -> submit -> approve
  console.log('\n[2] Create/Submit/Approve Job...');
  const jobRes = await post('/v1/jobs', { title: 'WS E2E Job', description: 'Test via WS script', budget: 777, city: 'Tehran' }, tokClient);
  const jobId = jobRes?.job?._id;
  if (!jobId) throw new Error('No jobId from create');

  await patch(`/v1/jobs/${jobId}`, { date: new Date(Date.now() + 3600*1000).toISOString() }, tokClient);
  await post(`/v1/jobs/${jobId}/submit`, { termsAccepted: true }, tokClient);
  await patch(`/v1/jobs/${jobId}/approve`, {}, tokAdmin);

  console.log('  ✔ Job approved:', jobId);

  // 3) Apply by model → applicationId
  console.log('\n[3] Apply by Model...');
  const applyRes = await post(`/v1/jobs/${jobId}/apply`, { note: 'I am interested', phone: '09120000000' }, tokModel);
  const applicationId = applyRes?.application?._id;
  if (!applicationId) throw new Error('No applicationId from apply');
  console.log('  ✔ Application created:', applicationId);

  // 4) Ensure thread (by-application) → threadId
  console.log('\n[4] Ensure Thread (by application)...');
  const thrRes = await post('/v1/threads/by-application', { applicationId }, tokClient);
  const threadId = thrRes?.data?._id || thrRes?.data?.id;
  if (!threadId) throw new Error('No threadId');
  console.log('  ✔ Thread ready:', threadId);

  // 5) Prepare sockets for client & model
  console.log('\n[5] Connect sockets...');
  const clientSock = io(WS_BASE, { auth: { token: tokClient }, transports: ['websocket'] });
  const modelSock  = io(WS_BASE, { auth: { token: tokModel  }, transports: ['websocket'] });

  function withTimeout(ev) {
    return new Promise((resolve) => setTimeout(resolve, ev));
  }

  const eventsLog = { client: [], model: [] };

  const attachHandlers = (name, sock) => {
    sock.on('connect', () => console.log(`  ✔ ${name} connected as ${sock.id}`));
    sock.on('connect_error', (err) => console.error(`  ✖ ${name} connect_error:`, err?.message || err));
    sock.on('disconnect', () => console.log(`  ℹ ${name} disconnected`));

    sock.on('message:new', (evt) => {
      eventsLog[name].push({ type: 'message:new', evt });
      console.log(`  📩 ${name} message:new`, {
        text: evt?.message?.text,
        threadId: evt?.threadId,
        from: evt?.message?.senderId || evt?.message?.fromUserId,
        to: evt?.message?.recipientId || evt?.message?.toUserId,
      });
    });
    sock.on('threads:unread-count', ({ count }) => {
      eventsLog[name].push({ type: 'unread-count', count });
      console.log(`  🔔 ${name} unread-count:`, count);
    });
    sock.on('typing', ({ userId, active }) => {
      eventsLog[name].push({ type: 'typing', userId, active });
      console.log(`  ⌨️ ${name} sees typing: user=${userId} active=${active}`);
    });
  };

  attachHandlers('client', clientSock);
  attachHandlers('model', modelSock);

  // Join both to thread room
  await withTimeout(500);
  clientSock.emit('thread:join', threadId);
  modelSock.emit('thread:join', threadId);
  console.log('  ✔ both joined thread room');

  // 6) Client sends a message
  console.log('\n[6] Client sends a message...');
  await new Promise((resolve) => {
    clientSock.emit('message:send', { applicationId, text: 'سلام از Client 👋' }, (ack) => {
      console.log('  ↩ server ack (client send):', ack);
      resolve();
    });
  });

  // wait to receive on other side
  await withTimeout(800);

  // 7) Model marks thread as read
  console.log('\n[7] Model marks thread read...');
  await new Promise((resolve) => {
    modelSock.emit('thread:read', threadId, (ack) => {
      console.log('  ↩ server ack (thread:read):', ack);
      resolve();
    });
  });

  // 8) Model replies
  console.log('\n[8] Model replies...');
  await new Promise((resolve) => {
    modelSock.emit('message:send', { applicationId, text: 'درود از Model 🙌' }, (ack) => {
      console.log('  ↩ server ack (model send):', ack);
      resolve();
    });
  });

  await withTimeout(800);

  // 9) Typing demo
  console.log('\n[9] Typing demo...');
  modelSock.emit('typing:start', threadId);
  await withTimeout(500);
  modelSock.emit('typing:stop', threadId);

  await withTimeout(500);

  // 10) Cleanup sockets
  clientSock.emit('thread:leave', threadId);
  modelSock .emit('thread:leave', threadId);
  await withTimeout(200);
  clientSock.disconnect();
  modelSock.disconnect();

  console.log('\n=== E2E COMPLETED ✅ ===\n');
})().catch((err) => {
  console.error('\nE2E FAILED ❌', err?.message || err);
  process.exit(1);
});
