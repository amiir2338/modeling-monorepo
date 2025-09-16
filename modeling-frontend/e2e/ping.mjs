const API_BASE = process.env.API_BASE || 'http://localhost:4000/api';
const FRONT_BASE = process.env.FRONT_BASE || 'http://localhost:3000';

async function probe(url) {
  try {
    const r = await fetch(url, { method: 'GET' });
    const text = await r.text();
    console.log('[PING]', url, '->', r.status, text.slice(0, 150));
    return r.ok;
  } catch (e) {
    console.log('[PING-ERR]', url, '->', e.message);
    return false;
  }
}

const ok1 = await probe(`${API_BASE}/ping`);
const ok2 = await probe(`${FRONT_BASE}`);

if (!ok1) process.exitCode = 2;
