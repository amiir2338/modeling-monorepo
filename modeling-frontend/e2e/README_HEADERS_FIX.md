# E2E Headers Fix (Playwright + fetch)
- حذف وابستگی به `supertest` برای درخواست‌های خارجی و استفاده از `fetch` تا مشکل نرفتن هدر Authorization حل شود.
- عدم استفاده از `/v1/me/client-profile` (در روت‌های شما وجود نداشت). clientId از پاسخ register یا payload توکن گرفته می‌شود.
- جریان کامل:
  1) register (client with name, model, admin)
  2) `/v1/auth/me` برای هر توکن
  3) create job (اول کلاینت؛ اگر 401 شد، ادمین با clientId)
  4) submit → approve (POST، اگر نشد PATCH)
  5) apply → thread → message → notifications

## Run
```
node e2e/bootstrap-e2e.mjs
```
Env:
```
API_BASE=http://localhost:4000/api
FRONT_BASE=http://localhost:3000
```
