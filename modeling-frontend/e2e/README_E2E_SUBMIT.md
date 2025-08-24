# E2E Patch (Submit → Approve flow)

This package fixes Stage-2 E2E based on your backend:
- Client register requires `name`
- Job must be submitted (`POST /v1/jobs/:id/submit` with `{termsAccepted:true}`) before admin can approve (`PATCH /v1/jobs/:id/approve`)

## Usage
1) Extract into your **frontend root**.
2) Ensure backend env:
```
PORT=4000
JWT_SECRET=supersecret
MONGODB_URI=mongodb://localhost:27017/modeling
```
3) Run:
```
node e2e/bootstrap-e2e.mjs
```

Or manual API check on Windows:
```
pwsh -File e2e/ps-e2e-submit.ps1 -API "http://localhost:4000/api"
```
