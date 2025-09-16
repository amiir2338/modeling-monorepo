// tools/check-api-paths.cjs  (CommonJS)

const axios = require('axios');

// کاندیدهای base و path
const bases = [
  'http://localhost:4000',     // ✅ پیشنهاد برای فرانت
  'http://localhost:4000/api', // ⚠️ گاهی اشتباهاً این‌طوری ست میشه
];
const paths = [
  '/api/v1/auth/login', // ✅ وقتی base ریشه باشه
  '/v1/auth/login',     // ⚠️ وقتی base خودش /api داره
];

async function tryLogin(url) {
  try {
    const res = await axios.post(
      url,
      { email: 'does-not-exist@example.com', password: 'wrong-pass' },
      { validateStatus: () => true }
    );
    return { ok: true, status: res.status, data: res.data };
  } catch (e) {
    return { ok: false, error: e?.message || String(e) };
  }
}

(async () => {
  console.log('🧪 Checking combinations of base + path ...\n');
  const results = [];
  for (const base of bases) {
    for (const path of paths) {
      const full = base.replace(/\/+$/, '') + path;
      const r = await tryLogin(full);
      results.push({ base, path, full, ...r });
    }
  }

  for (const r of results) {
    if (r.ok) console.log(`• ${r.full} -> status=${r.status}`);
    else console.log(`• ${r.full} -> ERROR: ${r.error}`);
  }

  console.log('\n🔎 Interpretation:');
  const ok401 = results.find((r) => r.ok && r.status === 401);
  const ok200 = results.find((r) => r.ok && (r.status === 200 || r.status === 201));
  const notFound = results.filter((r) => r.ok && r.status === 404);

  if (ok401) {
    console.log(`✅ مسیر معتبر پیدا شد (401 = ایمیل/پسورد غلط ولی آدرس درست): ${ok401.full}`);
  } else if (ok200) {
    console.log(`✅ مسیر معتبر پیدا شد: ${ok200.full}`);
  } else if (notFound.length) {
    console.log('❌ همه مسیرها 404 می‌دهند. احتمالاً /api دوبل شده یا مونت اشتباه است.');
  } else {
    console.log('❌ پاسخی از سرور نگرفتیم. مطمئن شو بک‌اند روی پورت 4000 روشنه.');
  }
})();
