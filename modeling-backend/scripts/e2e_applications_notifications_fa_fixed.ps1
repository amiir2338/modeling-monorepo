param(
  [string]$Base = "http://localhost:4000/api"
)

###############################################################################
# توابع کمکی
###############################################################################
function Title($t) { Write-Host "`n==================== $t ====================" }
function Explain($txt) { Write-Host "🔎 توضیح: $txt" }

function IsSuccessLike($resp) {
  if ($null -eq $resp) { return $false }
  if ($resp.ok -eq $true) { return $true }
  if ($resp.PSObject.Properties.Name -contains 'job') { return $true }
  if ($resp.PSObject.Properties.Name -contains 'application') { return $true }
  if ($resp.PSObject.Properties.Name -contains 'data') { return $true }
  return $false
}

function PrintOk($resp) {
  if (IsSuccessLike $resp) {
    Write-Host "✅ نتیجه: موفق" -ForegroundColor Green
  } elseif ($null -ne $resp) {
    Write-Host "⚠️  نتیجه: پاسخ برگشت اما الگوی موفق تشخیص داده نشد" -ForegroundColor Yellow
  } else {
    Write-Host "❌ نتیجه: خطا" -ForegroundColor Red
  }
}

function PrintJson($obj, $depth=8) {
  if ($null -ne $obj) { $obj | ConvertTo-Json -Depth $depth }
  else { Write-Host "(خالی/ناموفق)" }
}

function PostJson($url, $body, $token = $null) {
  $headers = @{}
  if ($token) { $headers["Authorization"] = "Bearer $token" }
  try {
    return Invoke-RestMethod $url -Method POST -ContentType "application/json" `
      -Headers $headers -Body ($body | ConvertTo-Json -Depth 10) -TimeoutSec 20
  } catch {
    if ($_.Exception.Response) {
      $sr = New-Object IO.StreamReader($_.Exception.Response.GetResponseStream())
      Write-Host "❌ خطای HTTP -> $($sr.ReadToEnd())" -ForegroundColor Red
    } else { Write-Host "❌ $($_.Exception.Message)" -ForegroundColor Red }
    return $null
  }
}

function PatchJson($url, $body, $token) {
  $headers = @{ Authorization = "Bearer $token" }
  try {
    return Invoke-RestMethod $url -Method PATCH -ContentType "application/json" `
      -Headers $headers -Body ($body | ConvertTo-Json -Depth 10) -TimeoutSec 20
  } catch {
    if ($_.Exception.Response) {
      $sr = New-Object IO.StreamReader($_.Exception.Response.GetResponseStream())
      Write-Host "❌ خطای HTTP -> $($sr.ReadToEnd())" -ForegroundColor Red
    } else { Write-Host "❌ $($_.Exception.Message)" -ForegroundColor Red }
    return $null
  }
}

function GetApi($url, $token = $null) {
  $headers = @{}
  if ($token) { $headers["Authorization"] = "Bearer $token" }
  try {
    return Invoke-RestMethod $url -Method GET -Headers $headers -TimeoutSec 20
  } catch {
    if ($_.Exception.Response) {
      $sr = New-Object IO.StreamReader($_.Exception.Response.GetResponseStream())
      Write-Host "❌ خطای HTTP -> $($sr.ReadToEnd())" -ForegroundColor Red
    } else { Write-Host "❌ $($_.Exception.Message)" -ForegroundColor Red }
    return $null
  }
}

###############################################################################
# شروع سناریو
###############################################################################

# 1) Health
Title "بررسی سلامت سرویس (Health)"
Explain "فراخوانی /api/health برای اطمینان از بالا بودن سرویس."
$health = GetApi "$Base/health"
PrintOk $health
PrintJson $health

# 2) ثبت‌نام کاربران (Client/Model/Admin)
Title "ثبت‌نام کاربران"
Explain "برای سناریو نیاز به سه نقش داریم: client (مالک آگهی)، model (متقاضی)، admin (تأیید آگهی)."
$pwd = "secret123"
$emailClient = "client$([int](Get-Random -Minimum 10000 -Maximum 99999))@ex.com"
$emailModel  = "model$([int](Get-Random -Minimum 10000 -Maximum 99999))@ex.com"
$emailAdmin  = "admin$([int](Get-Random -Minimum 10000 -Maximum 99999))@ex.com"

$regClient = PostJson "$Base/v1/auth/register" @{ email=$emailClient; password=$pwd; name="Client"; role="client" }
$regModel  = PostJson "$Base/v1/auth/register" @{ email=$emailModel;  password=$pwd; name="Model";  role="model"  }
$regAdmin  = PostJson "$Base/v1/auth/register" @{ email=$emailAdmin;  password=$pwd; name="Admin";  role="admin"  }

Write-Host "`nنتیجه ثبت‌نام Client:"; PrintOk $regClient; PrintJson $regClient
Write-Host "`nنتیجه ثبت‌نام Model:";  PrintOk $regModel;  PrintJson $regModel
Write-Host "`nنتیجه ثبت‌نام Admin:";  PrintOk $regAdmin;  PrintJson $regAdmin

$tokClient = $regClient.token
$tokModel  = $regModel.token
$tokAdmin  = $regAdmin.token

# 3) ایجاد Job توسط Client → تعیین تاریخ → Submit → Approve (Admin)
Title "ایجاد و تأیید آگهی"
Explain "Client یک آگهی ایجاد می‌کند، تاریخ را ست می‌کنیم، سپس Submit و در نهایت Admin تأیید می‌کند."
$job = PostJson "$Base/v1/jobs" @{ title="Notif Test Job"; description="End-to-end test"; budget=450; city="Tehran" } $tokClient
PrintOk $job; PrintJson $job
$jobId = $job.job._id

Explain "به‌روزرسانی آگهی: ست کردن تاریخ (برای اجازه Submit)."
$upd = PatchJson "$Base/v1/jobs/$jobId" @{ date="2025-09-01T10:00:00.000Z" } $tokClient
PrintOk $upd; PrintJson $upd

Explain "ارسال آگهی برای بازبینی (Submit) با تایید قوانین."
$sub = PostJson "$Base/v1/jobs/$jobId/submit" @{ termsAccepted=$true } $tokClient
PrintOk $sub; PrintJson $sub

Explain "تأیید آگهی توسط Admin (Approve) تا عمومی شود."
$app = PatchJson "$Base/v1/jobs/$jobId/approve" @{} $tokAdmin
PrintOk $app; PrintJson $app

# 4) Apply توسط Model (باید نوتیف برای Client ساخته شود)
Title "اپلای مدل روی آگهی (Trigger نوتیف برای Client)"
Explain "Model برای آگهی تأییدشده Apply می‌کند. انتظار می‌رود یک Notification برای Client (مالک آگهی) ساخته شود."
$apply = PostJson "$Base/v1/jobs/$jobId/apply" @{ note="Interested"; phone="09120000000" } $tokModel
PrintOk $apply; PrintJson $apply

# ✅ استخراج صحیح appId
$appId = $null
if ($apply -and $apply.application -and $apply.application._id) {
  $appId = $apply.application._id
} else {
  Write-Host "⚠️ ساختار پاسخ Apply با انتظار نمی‌خوانَد؛ appId پیدا نشد." -ForegroundColor Yellow
}

# 5) بررسی نوتیف‌های Client پس از Apply
Title "نوتیف‌های Client پس از اپلای مدل"
Explain "فراخوانی لیست نوتیف‌ها و شمارش خوانده‌نشده‌ها برای Client؛ باید حداقل یک آیتم مرتبط با اپلای وجود داشته باشد."
$clientList1 = GetApi "$Base/v1/notifications" $tokClient
PrintOk $clientList1; PrintJson $clientList1
$clientUnread1 = GetApi "$Base/v1/notifications/unread-count" $tokClient
Write-Host "`nشمارش نوتیف‌های خوانده‌نشده (Client):"; PrintOk $clientUnread1; PrintJson $clientUnread1

# 6) Client وضعیت Application را تغییر می‌دهد (باید نوتیف برای Model ساخته شود)
if ($appId) {
  Title "تغییر وضعیت درخواست توسط Client (Trigger نوتیف برای Model)"
  Explain "ابتدا reviewed سپس accepted؛ بعد نوتیف‌های Model را بررسی می‌کنیم."
  $st1 = PatchJson "$Base/v1/applications/$appId" @{ status="reviewed"; reason="Initial review" } $tokClient
  Write-Host "`nبه‌روز رسانی به reviewed:"; PrintOk $st1; PrintJson $st1

  $st2 = PatchJson "$Base/v1/applications/$appId" @{ status="accepted"; reason="Good fit" } $tokClient
  Write-Host "`nبه‌روز رسانی به accepted:"; PrintOk $st2; PrintJson $st2
} else {
  Write-Host "⏭️  به‌روزرسانی وضعیت را به علت نداشتن appId رد کردیم." -ForegroundColor Yellow
}

# 7) بررسی نوتیف‌های Model پس از تغییر وضعیت
Title "نوتیف‌های Model پس از تغییر وضعیت"
Explain "الان باید حداقل یک نوتیف از نوع application_updated برای Model ساخته شده باشد."
$modelList1 = GetApi "$Base/v1/notifications" $tokModel
PrintOk $modelList1; PrintJson $modelList1
$modelUnread1 = GetApi "$Base/v1/notifications/unread-count" $tokModel
Write-Host "`nشمارش نوتیف‌های خوانده‌نشده (Model):"; PrintOk $modelUnread1; PrintJson $modelUnread1

# 8) مارک کردن خوانده‌شدن اولین نوتیف Client (درصورت وجود)
Title "علامت‌گذاری به‌عنوان خوانده‌شده (Client)"
Explain "اگر نوتیفی برای Client وجود دارد، اولین آیتم را read=true می‌کنیم و شمارش جدید را بررسی می‌کنیم."
if ($clientList1.data -and $clientList1.data.Length -gt 0) {
  $firstId = $clientList1.data[0]._id
  $mark = PatchJson "$Base/v1/notifications/$firstId/read" @{} $tokClient
  Write-Host "`nنتیجه read:"; PrintOk $mark; PrintJson $mark

  $clientUnread2 = GetApi "$Base/v1/notifications/unread-count" $tokClient
  Write-Host "`nشمارش جدید خوانده‌نشده‌ها (Client):"; PrintOk $clientUnread2; PrintJson $clientUnread2
} else {
  Write-Host "هیچ نوتیفی برای Client پیدا نشد تا read شود." -ForegroundColor Yellow
}

Title "پایان سناریو"
Explain "اگر همه‌ی بخش‌ها ✅ بود، یعنی نوتیف‌ها و جریان اپلیکیشن‌ها سالم و کامل کار می‌کنند."
