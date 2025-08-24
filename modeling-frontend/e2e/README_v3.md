# E2E headers-fix v3
- هیچ استفاده‌ای از `request(API_BASE)` یا `/v1/me/client-profile` ندارد.
- هدرهای Authorization به‌صورت محافظه‌کارانه در سه شکل ارسال می‌شوند: `Authorization`, `authorization`, `x-access-token`.
- flow: register(با name برای client) → auth/me → create job(client; fallback admin+clientId) → submit → approve → apply → thread → message → notifications.
Run:
```
set API_BASE=http://localhost:4000/api
node e2e/bootstrap-e2e.mjs
```
