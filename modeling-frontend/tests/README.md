این سند کوتاه توضیح می‌دهد چگونه تست‌های E2E در این پروژه کار می‌کنند و چرا احراز هویت باید در کانتکست صفحه اجرا شود.

1) فلسفهٔ احراز هویت در تست‌ها
- بک‌اند کوکی HttpOnly به نام `access_token` ست می‌کند. این کوکی فقط از طریق هدر `Set-Cookie` و توسط مرورگر ذخیره می‌شود.
- اجرای درخواست‌های ثبت‌نام/ورود با `page.evaluate(() => fetch(..., { credentials: 'include' }))` باعث می‌شود مرورگر هدر `Set-Cookie` را دریافت و کوکی HttpOnly را ذخیره کند.
- استفاده از `page.request` یا `APIRequestContext` تست را از کانتکست مرورگر جدا می‌کند و برای قبول `Set-Cookie` توسط مرورگر کافی نیست.

2) چگونه از فیکسچر `tests/fixtures/auth.ts` استفاده کنیم
- هر تستی که نیاز به session در کانتکست مرورگر دارد، `import { test, expect } from './fixtures'` را در بالای فایل قرار دهد.
- سپس در test callback می‌توانید از `auth.register(email, pass, page)` و `auth.login(email, pass, page)` استفاده کنید تا درخواست‌ها داخل همان page اجرا شوند و کوکی ست شود.
- مثال:

```ts
import { test, expect } from './fixtures';

test('example', async ({ auth, page }) => {
  await page.goto('http://localhost:3000');
  await auth.register('a@e2e.test', 'Pass123!', page);
  await auth.login('a@e2e.test', 'Pass123!', page);
  const cookies = await page.context().cookies();
  // ادامهٔ تست با session
});
```

3) عیب‌یابی
- اگر `document.cookie` خالی است، به این معنی نیست که session وجود ندارد؛ کوکی HttpOnly در `document.cookie` نشان داده نمی‌شود. از `context.cookies()` استفاده کنید.
- برای گرفتن HAR / network logs، از تست تشخیصی `tests/full-diagnose.spec.ts` استفاده کنید — این تست HAR و `report.json` تولید می‌کند.

5) Helpers added in `testing-pack`
- `testing-pack/tests/utils/api.ts` exports `pageFetch(page, method, path, body)` which runs `fetch` inside the provided `Page` with `credentials: 'include'` and returns `{ status, ok, text }`.
- `testing-pack/tests/utils/authHelper.ts` exports `registerInPage(page, email, password, role?)` and `loginInPage(page, email, password)` which perform auth requests inside the page so the browser receives the HttpOnly cookie.

Usage example:
```ts
import { pageFetch } from 'testing-pack/tests/utils/api';
import { registerInPage, loginInPage } from 'testing-pack/tests/utils/authHelper';

// inside a test
await registerInPage(page, 'a@e2e.test', 'Pass123!');
await loginInPage(page, 'a@e2e.test', 'Pass123!');
const r = await pageFetch(page, 'GET', '/api/v1/jobs/my?limit=5');
expect(r.ok).toBeTruthy();
```

4) نکات CI
- Workflow نمونه در `.github/workflows/playwright-ci.yml` اضافه شده است. این فایل فرض می‌کند که `npm run dev` در هر دو پوشه‌ی `modeling-backend` و `modeling-frontend` سرویس‌ها را روی پورت‌های 4000 و 3000 راه‌اندازی می‌کند.
- اگر در runner نیاز به تنظیمات اضافه است (مثلاً MongoDB)، باید در job قبل از اجرای تست سرویس‌ها را فراهم کنید.

اگر بخواهی من می‌توانم:
- تست‌های باقی‌مانده را نیز مرور و به فیکسچر مهاجرت کنم (این کار را قبلاً برای چند تست انجام دادم).
- یک smoke test مستقل در `tests/` اضافه کنم تا CI سریع‌تر خطاها را نشان دهد.
