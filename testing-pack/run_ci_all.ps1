# run_ci_all.ps1
# اجرای کامل تست‌ها + ساخت گزارش HTML/JSON + جمع‌آوری آرتیفکت‌ها + خلاصه عددی
# اجرای پیشنهادی:
#   powershell -ExecutionPolicy Bypass -File .\run_ci_all.ps1

param(
  [string]$WebBase = $env:WEB_BASE_URL,
  [string]$ApiBase = $env:API_BASE_URL,
  [switch]$SkipSmoke
)

$ErrorActionPreference = 'Stop'

function Info($msg){ Write-Host "[+] $msg" -ForegroundColor Cyan }
function Warn($msg){ Write-Host "[!] $msg" -ForegroundColor Yellow }
function Fail($msg){ Write-Host "[-] $msg" -ForegroundColor Red; exit 1 }

# 0) بارگذاری .env (اگر وجود داشته باشد)
if (Test-Path ".env") {
  Info "Loading .env ..."
  Get-Content ".env" | ForEach-Object {
    if ($_ -match '^\s*([^#;][^=]+)=(.*)$') {
      $k = $matches[1].Trim()
      $v = $matches[2].Trim()
      [Environment]::SetEnvironmentVariable($k, $v)
    }
  }
}

# 1) پیش‌فرض‌ها
if (-not $WebBase) { $WebBase = "http://localhost:3000" }
if (-not $ApiBase) { $ApiBase = "http://localhost:4000/api" }
$env:WEB_BASE_URL = $WebBase
$env:API_BASE_URL = $ApiBase

Info "WEB_BASE_URL = $env:WEB_BASE_URL"
Info "API_BASE_URL = $env:API_BASE_URL"

# 2) آماده‌سازی مسیرها
$Artifacts = Join-Path (Get-Location) "artifacts"
New-Item -ItemType Directory -Force -Path $Artifacts | Out-Null

# 3) پیش‌نیازها
function Assert-Command($name){ if (-not (Get-Command $name -ErrorAction SilentlyContinue)) { return $false } return $true }
if (-not (Assert-Command "node")) { Fail "Node.js نصب نیست. ابتدا Node را نصب کن." }
if (-not (Test-Path "node_modules/@playwright/test")) {
  Info "Installing @playwright/test + TS toolchain ..."
  npm i -D @playwright/test typescript ts-node | Out-Null
}
if (-not (Assert-Command "newman")) {
  Warn "Newman نصب نیست → نصب سراسری ..."
  npm i -g newman | Out-Null
}
Info "Installing Playwright browsers (once) ..."
npx playwright install --with-deps | Out-Null

# 4) چکِ در دسترس بودن سرویس‌ها (اختیاری ولی مفید)
try {
  Info "Checking WEB_BASE_URL ..."
  $r1 = Invoke-WebRequest -Uri $env:WEB_BASE_URL -UseBasicParsing -TimeoutSec 5
  Info "Web status: $($r1.StatusCode)"
} catch { Warn "وب سرویس در دسترس نیست یا دیر پاسخ می‌دهد. ادامه می‌دهیم، ولی احتمال Fail بالاست." }

try {
  Info "Checking API_BASE_URL ..."
  $r2 = Invoke-WebRequest -Uri "$($env:API_BASE_URL)" -UseBasicParsing -TimeoutSec 5
  Info "API status: $($r2.StatusCode)"
} catch { Warn "API در دسترس نیست یا دیر پاسخ می‌دهد. ادامه می‌دهیم، ولی احتمال Fail بالاست." }

# 5) اجرای اسموک (اختیاری)
if (-not $SkipSmoke) {
  if (Test-Path "tests/00_smoke.spec.ts") {
    Info "Running smoke test (00_smoke.spec.ts) ..."
    npx playwright test tests/00_smoke.spec.ts --reporter=list
  } else {
    Warn "smoke spec پیدا نشد، از این مرحله عبور می‌کنیم."
  }
}

# 6) اجرای کامل تست‌ها و ساخت گزارش HTML
Info "Running FULL Playwright suite with HTML reporter ..."
npx playwright test --reporter=html

# 7) ساخت JSON تمیز از نتایج (برای تحلیل عددی)
Info "Exporting JSON report to artifacts/pw-report.json ..."
npx playwright test --reporter=json > "$Artifacts\pw-report.json"

# 8) زیپ کردن گزارش HTML برای اشتراک
if (Test-Path "playwright-report") {
  $zipPath = Join-Path $Artifacts "playwright-report.zip"
  Info "Zipping playwright-report → $zipPath"
  if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
  Compress-Archive -Path "playwright-report\*" -DestinationPath $zipPath
} else {
  Warn "پوشه‌ی playwright-report پیدا نشد."
}

# 9) اجرای Newman (اگر کالکشن Postman موجود است)
$PostmanCollection = ".\postman\modeling_api_collection.json"
if (Test-Path $PostmanCollection) {
  Info "Running Newman on $PostmanCollection ..."
  newman run $PostmanCollection `
    --reporters cli,htmlextra `
    --reporter-htmlextra-export "$Artifacts\newman-report.html" `
    --env-var "API_BASE_URL=$($env:API_BASE_URL)" `
    --env-var "CLIENT_EMAIL=$($env:CLIENT_EMAIL)" `
    --env-var "CLIENT_PASSWORD=$($env:CLIENT_PASSWORD)"
} else {
  Warn "کالکشن Postman پیدا نشد → مرحله‌ی Newman رد شد."
}

# 10) اجرای k6 (اگر نصب است) — اسمُوک سبک روی /jobs
if (Assert-Command "k6" -eq $true -and (Test-Path ".\k6\jobs_list_smoke.js")) {
  Info "Running k6 smoke ..."
  k6 run .\k6\jobs_list_smoke.js --summary-export "$Artifacts\k6-summary.json"
} else {
  Warn "k6 یا اسکریپت اسمُوک موجود نیست → رد شد."
}

# 11) استخراج خلاصه‌ی عددی از JSON پلی‌رایت
function Get-TestsFromSuite($suite){
  $list = @()
  if ($suite.suites) {
    foreach ($s in $suite.suites) { $list += Get-TestsFromSuite $s }
  }
  if ($suite.tests) {
    foreach ($t in $suite.tests) {
      $res = $null
      if ($t.results -and $t.results.Count -gt 0) { $res = $t.results[$t.results.Count-1] }
      $status = if ($res) { $res.status } else { $t.outcome }
      $errMsg = $null
      if ($res -and $res.error) {
        if ($res.error.message) { $errMsg = $res.error.message }
        elseif ($res.error.value) { $errMsg = $res.error.value }
      }
      $file = $null
      if ($t.location -and $t.location.file) { $file = $t.location.file }
      $list += [PSCustomObject]@{
        title = $t.title
        file = $file
        status = $status
        error = $errMsg
        duration_ms = if ($res) { $res.duration } else { $null }
      }
    }
  }
  return $list
}

$SummaryPath = Join-Path $Artifacts "summary.txt"
$TestsCsv    = Join-Path $Artifacts "tests.csv"
$TestsJson   = Join-Path $Artifacts "tests.json"

if (Test-Path "$Artifacts\pw-report.json") {
  Info "Building summary from pw-report.json ..."
  $json = Get-Content "$Artifacts\pw-report.json" -Raw | ConvertFrom-Json
  $all = @()
  if ($json.suites) {
    foreach ($s in $json.suites) { $all += Get-TestsFromSuite $s }
  } elseif ($json.suite) {
    $all += Get-TestsFromSuite $json.suite
  }

  if ($all.Count -gt 0) {
    $passed = ($all | Where-Object { $_.status -match 'pass|expected' }).Count
    $failed = ($all | Where-Object { $_.status -match 'fail|unexpected|timed' }).Count
    $skipped = ($all | Where-Object { $_.status -match 'skip' }).Count

    $topReasons = ($all | Where-Object { $_.error } |
      ForEach-Object { $_.error.Split("`n")[0] } |
      Group-Object | Sort-Object Count -Desc | Select-Object -First 8)

    "# ===== Playwright Summary =====" | Out-File $SummaryPath -Encoding utf8
    "Total   : $($all.Count)"        | Out-File $SummaryPath -Append
    "Passed  : $passed"              | Out-File $SummaryPath -Append
    "Failed  : $failed"              | Out-File $SummaryPath -Append
    "Skipped : $skipped"             | Out-File $SummaryPath -Append
    ""                               | Out-File $SummaryPath -Append
    "Top Failure Reasons:"           | Out-File $SummaryPath -Append
    foreach ($r in $topReasons) {
      (" - {0} ×{1}" -f $r.Name, $r.Count) | Out-File $SummaryPath -Append
    }

    $all | Export-Csv -NoTypeInformation -Encoding UTF8 -Path $TestsCsv
    $all | ConvertTo-Json -Depth 6 | Out-File $TestsJson -Encoding utf8
    Info "Summary saved → $SummaryPath"
  } else {
    Warn "هیچ تستی در JSON پیدا نشد."
  }
} else {
  Warn "pw-report.json وجود ندارد؛ از مرحله‌ی خلاصه عبور شد."
}

Info "=== DONE ==="
Info "Artifacts:"
Info " - $Artifacts\pw-report.json"
Info " - $Artifacts\playwright-report.zip"
Info " - $Artifacts\summary.txt"
Info " - $Artifacts\tests.csv"
Info " - $Artifacts\tests.json"
Info " - $Artifacts\newman-report.html (اگر اجرا شده باشد)"
Info " - $Artifacts\k6-summary.json (اگر اجرا شده باشد)"
