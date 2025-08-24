# Stage 2 — Auto-Scaffold + E2E (Frontend)
Run:
```bash
node e2e/bootstrap-e2e.mjs
```
Env:
- `API_BASE` (default `http://localhost:4000/api`)
- `FRONT_BASE` (default `http://localhost:3000`)
This scaffolds/patches pages (Inbox/Chat/Notifications), ensures `.env.local` has `NEXT_PUBLIC_API_BASE`, and runs tests.
