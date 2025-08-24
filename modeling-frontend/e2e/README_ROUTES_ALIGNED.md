# Routes-aligned E2E
This test suite aligns with your routes:
- Auth: POST /v1/auth/register | /v1/auth/login
- Profiles: GET /v1/me/client-profile
- Jobs: POST /v1/jobs ; POST /v1/jobs/:id/submit ; POST or PATCH /v1/jobs/:id/approve
- Apply: POST /v1/jobs/:id/apply
- Threads: POST /v1/threads/by-application
- Messages: POST /v1/messages
- Notifications: GET /v1/notifications

Run:
```bash
node e2e/bootstrap-e2e.mjs
```
Environment:
- API_BASE (defaults to http://localhost:4000/api)
