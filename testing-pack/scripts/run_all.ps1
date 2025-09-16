# Requires: Node, @playwright/test, newman, (optional) k6
param(
  [string]$WebBase = $env:WEB_BASE_URL,
  [string]$ApiBase = $env:API_BASE_URL
)

if (-not $WebBase) { $WebBase = "http://localhost:3000" }
if (-not $ApiBase) { $ApiBase = "http://localhost:4000/api" }

Write-Host "`n[+] Using WEB_BASE_URL=$WebBase"
Write-Host "[+] Using API_BASE_URL=$ApiBase`n"

# Ensure artifacts dir
New-Item -ItemType Directory -Force -Path .\artifacts | Out-Null

# 1) Playwright
Write-Host "[1/3] Running Playwright E2E ..."
$env:WEB_BASE_URL = $WebBase
$env:API_BASE_URL = $ApiBase
npx playwright test --config=playwright.config.ts

# 2) Newman (Postman)
Write-Host "[2/3] Running Newman API checks ..."
powershell -ExecutionPolicy Bypass -File .\postman\run_newman.ps1

# 3) k6 (optional)
if (Get-Command k6 -ErrorAction SilentlyContinue) {
  Write-Host "[3/3] Running k6 smoke ..."
  k6 run .\k6\jobs_list_smoke.js --summary-export .\artifacts\k6-summary.json
} else {
  Write-Host "[3/3] k6 not installed -- skipping performance smoke."
}

Write-Host "`n=== ALL TESTS DONE ==="
Write-Host "Artifacts in .\artifacts\ (Playwright report, traces, HAR, Newman HTML, k6 summary)"
