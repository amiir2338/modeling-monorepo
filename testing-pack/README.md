# Modeling Project • Test Pack (Playwright + Newman + k6)

This pack gives you a **complete, ready-to-run test suite** for your Modeling app (frontend + backend).  
It is organized in stages so you can run everything or pick specific layers.

> Default **base URLs** can be changed via environment variables in `.env` or your shell:
>
> - `WEB_BASE_URL` (default: http://localhost:3000)
> - `API_BASE_URL` (default: http://localhost:4000/api)
>
> Default **test users** are set via env too (see `.env.example`).

## Contents

- **Playwright E2E** (UI + API smoke, auth, jobs, permissions, admin, routes)
- **Postman + Newman** (backend endpoints)
- **k6 smoke** (basic performance for hot routes)
- **PowerShell runners** for Windows

## Quick Start (Windows, PowerShell)

1. Install deps (once):
   ```powershell
   npm i -D @playwright/test
   npx playwright install --with-deps
   npm i -g newman
   ```

2. Copy `.env.example` to `.env` and set credentials.

3. Run everything:
   ```powershell
   ./scripts/run_all.ps1
   ```

Artifacts will be in `artifacts/`:
- Playwright HTML report, traces, videos, HAR files
- Newman HTML report (`newman-report.html`)
- k6 summary (`k6-summary.json`)

## Structure

```
testing-pack/
  README.md
  .env.example
  playwright.config.ts
  routes.json
  tests/
    00_smoke.spec.ts
    01_auth.spec.ts
    02_jobs.spec.ts
    03_profile.spec.ts
    04_messaging.spec.ts
    05_admin.spec.ts
    06_permissions.spec.ts
    07_uploads.spec.ts
    08_notifications.spec.ts
    09_regression_routes.spec.ts
    utils/
      testEnv.ts
      authHelper.ts
      api.ts
  postman/
    modeling_api_collection.json
    run_newman.ps1
  k6/
    jobs_list_smoke.js
  scripts/
    run_all.ps1
```
