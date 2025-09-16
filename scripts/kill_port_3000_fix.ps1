$c = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
if ($c) {
  $ownPid = $c.OwningProcess
  Write-Host "Killing PID $ownPid"
  try {
    Stop-Process -Id $ownPid -Force -ErrorAction Stop
    Write-Host "Killed $ownPid"
  } catch {
    Write-Host "Failed to kill $ownPid:" $_.Exception.Message
  }
} else {
  Write-Host 'Port 3000 not in use'
}
