$c = Get-NetTCPConnection -LocalPort 4000 -ErrorAction SilentlyContinue
if ($c) {
  $pid = $c.OwningProcess
  Write-Host "Killing PID $pid"
  try { Stop-Process -Id $pid -Force; Write-Host "Killed $pid" } catch { Write-Host "Failed to kill $pid" }
} else {
  Write-Host 'Port 4000 not in use'
}
