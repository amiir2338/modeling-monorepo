// tools/e2e-api.cjs
const axios = require('axios');

const BASE = process.env.API_BASE?.replace(/\/+$/,'') || 'http://localhost:4000';
const API = `${BASE}/api/v1`;
const email = `e2e+${Date.now()}@example.com`;
const password = 'Passw0rd!';
let jar = axios.create({ baseURL: BASE, withCredentials: true, validateStatus: () => true });

function log(step, resOrErr) {
  const time = new Date().toLocaleTimeString();
  if (resOrErr?.status) {
    console.log(`[${time}] ${step} -> ${resOrErr.status}`);
    if (typeof resOrErr.data === 'object') console.log(JSON.stringify(resOrErr.data).slice(0,600));
  } else {
    console.log(`[${time}] ${step} -> ERROR`, resOrErr?.message || String(resOrErr));
  }
}

(async () => {
  try {
    // 0) پینگ
    let r = await jar.get('/api/ping'); log('PING', r);

    // 1) ثبت‌نام
    r = await jar.post(`${API}/auth/register`, { email, password, role: 'client', name: 'E2E' }); log('REGISTER', r);

    // 2) اگر کوکی ست نشد، لاگین
    r = await jar.post(`${API}/auth/login`, { email, password }); log('LOGIN', r);

    // 3) me
    r = await jar.get(`${API}/auth/me`); log('ME', r);

    // 4) ایجاد فرصت (client)
    const job = {
      title: 'E2E Test Job',
      description: 'created by e2e',
      budget: 1234500,
      city: 'Tehran',
      date: '2025-12-31',
      status: 'draft'
    };
    r = await jar.post(`${API}/jobs`, job); log('CREATE_JOB', r);
    const jobId = r.data?.data?.job?._id || r.data?.job?._id || r.data?._id;

    // 5) فهرست با فیلتر (مثلاً city=Tehran)
    r = await jar.get(`${API}/jobs`, { params: { city: 'Tehran' } }); log('LIST_FILTER', r);

    // 6) ارسال برای بررسی (اگر مسیر اول نبود، دومی امتحان می‌شود)
    let submit = await jar.post(`${API}/jobs/${jobId}/submit`, { termsAccepted: true });
    if (submit.status === 404) submit = await jar.post(`${API}/jobs/submit/${jobId}`, { termsAccepted: true });
    log('SUBMIT_FOR_REVIEW', submit);

    // 7) لاگ‌آوت
    r = await jar.post(`${API}/auth/logout`, {}); log('LOGOUT', r);

    // 8) me باید 401 یا fail بده
    r = await jar.get(`${API}/auth/me`); log('ME_AFTER_LOGOUT', r);

  } catch (e) {
    log('FATAL', e);
    process.exit(1);
  }
})();
