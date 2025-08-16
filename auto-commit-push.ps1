<#
  Auto commit & push on filesystem changes
  Author: you
  Usage: Set-ExecutionPolicy -Scope Process Bypass ; .\auto-commit-push.ps1
#>

# ===== تنظیمات =====
$RepoPath     = "C:\Users\amir\Desktop\db model"  # مسیر ریشه مونوریپو
$RemoteName   = "origin"
$BranchName   = "main"
$CommitPrefix = "chore(auto): sync"

# الگوهای نادیده‌گرفتن مسیرها
$IgnorePatterns = @(
  "\\.git\\",
  "node_modules\\",
  "\\.next\\",
  "dist\\",
  "build\\",
  "coverage\\",
  "\\.turbo\\",
  "\\.vercel\\",
  "\\.DS_Store$",
  "Thumbs\.db$"
)

# ===== توابع =====
function Should-IgnorePath([string]$path) {
  foreach ($p in $IgnorePatterns) {
    if ($path -replace '/', '\' -match $p) { return $true }
  }
  return $false
}

function Ensure-GitReady {
  try {
    Set-Location -Path $RepoPath
  } catch {
    Write-Host "❌ مسیر پیدا نشد: $RepoPath" -ForegroundColor Red
    exit 1
  }
  $git = git --version 2>$null
  if (-not $git) {
    Write-Host "❌ git نصب/دردسترس نیست." -ForegroundColor Red
    exit 1
  }
  # نمایش ریموت فعلی
  Write-Host "✅ Git OK. Remote(s):" -ForegroundColor Green
  git remote -v
}

function Commit-And-Push {
  Set-Location -Path $RepoPath

  # اگر چیزی برای کامیت نیست، بی‌خیال
  $status = git status --porcelain
  if (-not $status) {
    Write-Host "• چیزی برای کامیت نیست." -ForegroundColor DarkGray
    return
  }

  git add -A | Out-Null

  $stamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
  $msg   = "$CommitPrefix @ $stamp"
  git commit -m $msg | Out-Null

  Write-Host "↑ Pull --rebase از $RemoteName/$BranchName ..." -ForegroundColor Yellow
  try {
    git pull --rebase $RemoteName $BranchName
  } catch {
    Write-Host "⚠ خطا در pull --rebase (ادامه می‌دهیم): $($_.Exception.Message)" -ForegroundColor DarkYellow
  }

  Write-Host "↑ Push به $RemoteName/$BranchName ..." -ForegroundColor Yellow
  try {
    git push $RemoteName $BranchName
    Write-Host "✅ Push شد." -ForegroundColor Green
  } catch {
    Write-Host "❌ Push ناموفق: $($_.Exception.Message)" -ForegroundColor Red
  }
}

# ===== راه‌اندازی =====
Ensure-GitReady

# واچر فایل‌سیستم
$watcher = New-Object System.IO.FileSystemWatcher
$watcher.Path = $RepoPath
$watcher.Filter = "*"
$watcher.IncludeSubdirectories = $true
$watcher.EnableRaisingEvents = $true

# Debounce: پس از آخرین تغییر، N ثانیه صبر کن
$DebounceSeconds = 8
$script:LastChange = $null
$script:Pending    = $false

# هندلر رویدادها
$action = {
  param($sender, $eventArgs)

  $fullPath = $eventArgs.FullPath
  if (Should-IgnorePath $fullPath) { return }

  $script:LastChange = Get-Date
  $script:Pending = $true
  Write-Host ("… تغییر: {0} ({1})" -f $eventArgs.ChangeType, $fullPath) -ForegroundColor Cyan
}

# ثبت رویدادها
$subs = @()
$subs += Register-ObjectEvent $watcher Changed -Action $action
$subs += Register-ObjectEvent $watcher Created -Action $action
$subs += Register-ObjectEvent $watcher Deleted -Action $action
$subs += Register-ObjectEvent $watcher Renamed -Action $action

Write-Host "👀 در حال مشاهده تغییرات در: $RepoPath" -ForegroundColor Green
Write-Host "برای توقف: Ctrl + C" -ForegroundColor DarkGray

# حلقه اصلی: debounce و اجرای commit/push
try {
  while ($true) {
    Start-Sleep -Seconds 2
    if ($script:Pending -and $script:LastChange) {
      $elapsed = (New-TimeSpan -Start $script:LastChange -End (Get-Date)).TotalSeconds
      if ($elapsed -ge $DebounceSeconds) {
        Write-Host "⏳ تغییرات پایدار شد؛ در حال commit & push ..." -ForegroundColor Magenta
        $script:Pending = $false
        Commit-And-Push
      }
    }
  }
} finally {
  foreach ($s in $subs) { Unregister-Event -SourceIdentifier $s.Name -ErrorAction SilentlyContinue }
  $watcher.Dispose()
}
