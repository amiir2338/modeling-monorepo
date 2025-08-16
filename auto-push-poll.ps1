# ==== CONFIG ====
$RepoPath   = "C:\Users\amir\Desktop\db model"
$RemoteName = "origin"
$BranchName = "main"
$RemoteUrl  = "https://github.com/amiir2338/modeling-monorepo.git"  # اگر فرق دارد عوض کن

# ==== Helpers ====
function Ok($m){ Write-Host $m -ForegroundColor Green }
function Warn($m){ Write-Host $m -ForegroundColor Yellow }
function Err($m){ Write-Host $m -ForegroundColor Red }

Write-Host "== Step 1: ورود به مسیر ==" -ForegroundColor Cyan
try {
  if (-not (Test-Path $RepoPath)) { Err "مسیر یافت نشد: $RepoPath"; throw "NO_PATH" }
  Set-Location -Path $RepoPath
  Ok "داخل مسیر: $RepoPath"
} catch { return }

Write-Host "== Step 2: چک Git ==" -ForegroundColor Cyan
$gitVer = git --version 2>$null
if (-not $gitVer) { Err "git نصب/در PATH نیست."; return }
Ok "Git: $gitVer"

Write-Host "== Step 3: چک ریپو ==" -ForegroundColor Cyan
if (-not (Test-Path ".git")) {
  Warn "ریپو گیت نبود → git init"
  git init | Out-Null
} else { Ok ".git وجود دارد" }

Write-Host "== Step 4: چک ریموت ==" -ForegroundColor Cyan
$remotes = git remote -v
if (-not $remotes) {
  Warn "remote وجود ندارد → اضافه می‌کنم: $RemoteName = $RemoteUrl"
  try { git remote add $RemoteName $RemoteUrl } catch { Err "remote add خطا: $($_.Exception.Message)"; return }
} else {
  Ok "Remotes:"; git remote -v
  $hasOrigin = (git remote) -contains $RemoteName
  if (-not $hasOrigin) {
    Warn "origin وجود ندارد → اضافه می‌کنم"
    try { git remote add $RemoteName $RemoteUrl } catch { Err "remote add خطا: $($_.Exception.Message)"; return }
  }
}

Write-Host "== Step 5: چک برنچ ==" -ForegroundColor Cyan
try {
  $cur = (git rev-parse --abbrev-ref HEAD).Trim()
} catch { $cur = "" }
if ($cur -ne $BranchName) {
  Warn "برنچ فعلی '$cur' → تغییر به '$BranchName'"
  try { git branch -M $BranchName } catch { Err "branch -M خطا: $($_.Exception.Message)"; return }
} else { Ok "برنچ فعلی: $cur" }

Write-Host "== Step 6: تست Pull --rebase ==" -ForegroundColor Cyan
try { git pull --rebase $RemoteName $BranchName } catch { Warn "pull --rebase خطا: $($_.Exception.Message)" }

Write-Host "== Step 7: تست Push ==" -ForegroundColor Cyan
try {
  $dirty = git status --porcelain
  if ($dirty) {
    Warn "تغییرات لوکال موجود است → commit"
    git add -A | Out-Null
    $stamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    git commit -m "chore(auto): local changes @ $stamp" | Out-Null
  } else {
    git commit --allow-empty -m "chore(auto): connectivity test" | Out-Null
  }
  git push $RemoteName $BranchName
  Ok "Push موفق ✅"
} catch {
  Err "Push ناموفق: $($_.Exception.Message)"
  Warn "اگر احراز هویت می‌خواهد: یک‌بار دستی بزن →  git push -u origin $BranchName"
  Warn "و اگر لازم شد:  git config --global credential.helper manager"
}

Write-Host "== Step 8: شروع حالت خودکار (هر 30 ثانیه) ==" -ForegroundColor Cyan
while ($true) {
  try {
    $dirty = git status --porcelain
    if ($dirty) {
      Write-Host "→ تغییرات شناسایی شد، commit/pull --rebase/push ..." -ForegroundColor Magenta
      git add -A | Out-Null
      $stamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
      git commit -m "chore(auto): sync @ $stamp" | Out-Null
      try { git pull --rebase $RemoteName $BranchName } catch { Warn "pull --rebase: $($_.Exception.Message)" }
      try { git push $RemoteName $BranchName; Ok "Push موفق" } catch { Err "Push ناموفق: $($_.Exception.Message)" }
    } else {
      Write-Host "• تغییری نیست..." -ForegroundColor DarkGray
    }
  } catch {
    Err "Loop error: $($_.Exception.Message)"
  }
  Start-Sleep -Seconds 30
}
