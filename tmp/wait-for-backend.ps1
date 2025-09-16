$ok = $false
$start = Get-Date
while (((Get-Date) - $start).TotalSeconds -lt 30 -and -not $ok) {
  try {
    $r = Invoke-RestMethod -Method GET -Uri 'http://127.0.0.1:4000/api/ping' -TimeoutSec 3
    $ok = $true
    Write-Host 'ping ok'
  } catch {
    Start-Sleep -Seconds 1
  }
}
if (-not $ok) { Write-Host 'ping failed'; exit 2 } else { Write-Host 'backend ready' }
