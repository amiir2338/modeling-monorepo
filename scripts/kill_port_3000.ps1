$c = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
if ($c) {
  $pid = $c.OwningProcess
  Write-Host "Killing PID $pid"
  Stop-Process -Id $pid -Force
} else {
  Write-Host 'Port 3000 not in use'
}
