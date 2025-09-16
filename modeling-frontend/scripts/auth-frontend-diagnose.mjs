// scripts/auth-frontend-diagnose.mjs
// Frontend Auth end-to-end diagnostics (Node, Axios + Cookie Jar)
// Run: node scripts/auth-frontend-diagnose.mjs --base http://localhost:4000 --next http://localhost:3000

import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { CookieJar } from 'tough-cookie';
import { wrapper as axiosCookieJarSupport } from 'axios-cookiejar-support';

const argv = new Map(process.argv.slice(2).map((s) => {
  const m = s.match(/^--([^=]+)=(.*)$/); 
  return m ? [m[1], m[2]] : [s.replace(/^--/,''), true];
}));

const BASE = argv.get('base') || process.env.API_BASE || 'http://localhost:4000';
const NEXT = argv.get('next') || process.env.NEXT_BASE; // مثلا http://localhost:3000
const REGISTER = argv.get('register') || '/api/v1/auth/register';
const LOGIN    = argv.get('login')    || '/api/v1/auth/login';
const ME       = argv.get('me')       || '/api/v1/auth/me';
const LOGOUT   = argv.get('logout')   || '/api/v1/auth/logout';
const PAGE     = argv.get('page')     || '/client/dashboard'; // صفحهٔ محافظت‌شدهٔ Next

const stamp = new Date().toISOString().replace(/[-:T]/g,'').slice(0,15);
const LOG_PATH = path.join(process.cwd(), `auth-frontend-diagnose-${stamp}.log`);
function log(...args){
  const line = `[${new Date().toLocaleTimeString()}] ${args.join(' ')}`;
  console.log(line);
  fs.appendFileSync(LOG_PATH, line + '\n');
}

axiosCookieJarSupport(axios);
const jar = new CookieJar();
const api = axios.create({
  baseURL: BASE,
  withCredentials: true,
  jar,
  headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
  validateStatus: () => true, // ما خودمون لاگ می‌کنیم
});

async function cookieStringFor(url) {
  return new Promise((resolve) => {
    jar.getCookies(url, (err, cookies) => {
      if (err) return resolve('');
      resolve(cookies.map(c => `${c.key}=${c.value}`).join('; '));
    });
  });
}

async function step(name, fn){
  log(`--- ${name} ---`);
  try {
    const out = await fn();
    log(`OK: ${name}`);
    return out;
  } catch (e) {
    log(`FAIL: ${name} -> ${e?.message || e}`);
    throw e;
  }
}

function bodyPreview(d){
  try{
    const s = typeof d === 'string' ? d : JSON.stringify(d);
    return s.length > 600 ? s.slice(0,600)+'…' : s;
  }catch{ return '' }
}

(async () => {
  log(`Log => ${LOG_PATH}`);
  log(`BASE=${BASE} NEXT=${NEXT || '(skip)'} REGISTER=${REGISTER} LOGIN=${LOGIN} ME=${ME} LOGOUT=${LOGOUT} PAGE=${PAGE}`);

  const email = `test+${Date.now()}@example.com`;
  const password = `Passw0rd!`;
  log(`Email=${email}`);

  // A) /api/ping (اختیاری اگر دارید)
  await step('PING', async () => {
    try{
      const r = await api.get('/api/ping');
      log(`Status=${r.status} Body=${bodyPreview(r.data)}`);
    }catch(err){
      log(`PING skipped or failed: ${err?.message || err}`);
    }
  });

  // B) Register
  await step('REGISTER', async () => {
    const r = await api.post(REGISTER, { email, password, name:'Diag', role:'client' });
    log(`Status=${r.status}`);
    log(`Set-Cookie=${(r.headers['set-cookie']||[]).join(' | ')}`);
    log(`Body=${bodyPreview(r.data)}`);
  });

  // C) Login wrong
  await step('LOGIN_WRONG', async () => {
    const r = await api.post(LOGIN, { email, password: password + '-wrong' });
    log(`Status=${r.status}`);
    log(`Set-Cookie=${(r.headers['set-cookie']||[]).join(' | ')}`);
    log(`Body=${bodyPreview(r.data)}`);
  });

  // D) Login ok
  await step('LOGIN_OK', async () => {
    const r = await api.post(LOGIN, { email, password });
    log(`Status=${r.status}`);
    log(`Set-Cookie=${(r.headers['set-cookie']||[]).join(' | ')}`);
    log(`Body=${bodyPreview(r.data)}`);
    const jarStr = await cookieStringFor(BASE);
    log(`CookieJar(BASE)=${jarStr}`);
    if(!jarStr.includes('access_token=')) {
      log('!! WARNING: access_token not found in cookie jar after login');
    }
  });

  // E) ME (with cookie)
  await step('ME', async () => {
    const r = await api.get(ME);
    log(`Status=${r.status}`);
    log(`Body=${bodyPreview(r.data)}`);
  });

  // F) (Optional) Next protected page test
  if (NEXT) {
    await step('NEXT_PAGE', async () => {
      // new axios instance pointed to NEXT, sharing the same jar
      const next = axios.create({
        baseURL: NEXT,
        withCredentials: true,
        jar,
        maxRedirects: 0, // ببینیم ریدایرکت می‌شه یا نه
        validateStatus: () => true,
      });
      const r = await next.get(PAGE);
      log(`Status=${r.status} URL=${NEXT}${PAGE}`);
      const loc = r.headers['location'];
      if (loc) log(`Redirect => ${loc}`);
      const jarNext = await cookieStringFor(NEXT);
      log(`CookieJar(NEXT)=${jarNext}`);
      if (r.status >= 300 && r.status < 400) {
        log('=> احتمالا Middleware توکن را ندیده و به لاگین ریدایرکت کرده.');
      } else if (r.status === 200) {
        log('=> صفحه بدون ریدایرکت لود شد (توکن توسط Next دیده شده).');
      }
    });
  }

  // G) Logout
  await step('LOGOUT', async () => {
    const r = await api.post(LOGOUT, {});
    log(`Status=${r.status}`);
    log(`Set-Cookie=${(r.headers['set-cookie']||[]).join(' | ')}`);
    const jarStr = await cookieStringFor(BASE);
    log(`CookieJar(BASE after logout)=${jarStr}`);
  });

  // H) ME after logout
  await step('ME_AFTER_LOGOUT', async () => {
    const r = await api.get(ME);
    log(`Status=${r.status}`);
    log(`Body=${bodyPreview(r.data)}`);
  });

  log('----- SUMMARY -----');
  log(`Done. Send log file: ${LOG_PATH}`);
})().catch(e=>{
  log(`FATAL: ${e?.message || e}`);
  log(`Send log file: ${LOG_PATH}`);
  process.exit(1);
});
