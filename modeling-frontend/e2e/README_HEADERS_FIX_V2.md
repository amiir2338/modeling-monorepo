# E2E headers-fix v2
- JS-only bootstrap (بدون TypeScript annotation)
- استفاده از fetch برای درخواست‌ها تا هدر Authorization حتماً ارسال شود
- حذف کامل وابستگی به `/v1/me/client-profile`
- فلو: register(client+name, model, admin) → /auth/me → create job (client یا admin+clientId) → submit → approve → apply → thread → message → notifications

## Run
```
node e2e/bootstrap-e2e.mjs
```

### Quick auth check
وقتی توکن داری:
```
node e2e/quick-auth-check.mjs http://localhost:4000/api <TOKEN>
```
باید status=200 و نقش/کاربر برگردد.
