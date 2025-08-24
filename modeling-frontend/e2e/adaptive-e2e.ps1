Param([string]$API = "http://localhost:4000/api")
$ErrorActionPreference = "Stop"
$Password = "Passw0rd!"
$ts = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
$ClientEmail = "client.e2e+$ts@test.com"
$ModelEmail  = "model.e2e+$ts@test.com"
$AdminEmail  = "admin.e2e+$ts@test.com"

function J($o){ $o | ConvertTo-Json -Depth 12 }
function TryParse($s){ try { $s | ConvertFrom-Json } catch { $null } }
function Post($url,$body,$headers=@{}){
  try { Invoke-RestMethod -Uri $url -Method POST -ContentType "application/json" -Body (J $body) -Headers $headers }
  catch { $raw = $_.ErrorDetails.Message; $p = TryParse $raw; if ($p -ne $null){ return $p } else { throw $_ } }
}
function ExtractToken($res){
  if ($null -ne $res.token){ return $res.token }
  if ($null -ne $res.data -and $null -ne $res.data.token){ return $res.data.token }
  return $null
}
function ExtractId($obj){
  if ($null -ne $obj._id){ return $obj._id }
  if ($null -ne $obj.id){ return $obj.id }
  return $null
}
function Register($email,$password,$role,$name){
  $body = @{ email=$email; password=$password; role=$role }
  if ($role -eq "client" -and $name){ $body.name = $name }
  Post "$API/v1/auth/register" $body
}
function Login($email,$password){ Post "$API/v1/auth/login" @{ email=$email; password=$password } }

Write-Host "== Auth (with client name) =="
$clientReg = Register $ClientEmail $Password "client" "Client $ts"
$modelReg  = Register $ModelEmail  $Password "model"  $null
$adminReg  = Register $AdminEmail  $Password "admin"  $null
$clientToken = ExtractToken $clientReg
$modelToken  = ExtractToken $modelReg
$adminToken  = ExtractToken $adminReg
if (-not $clientToken -or -not $modelToken -or -not $adminToken){
  Write-Host "Auth responses:" (J @{ client=$clientReg; model=$modelReg; admin=$adminReg })
  throw "Auth failed."
}

Write-Host "== Create Job (client) =="
$jobRes = Post "$API/v1/jobs" @{ title="E2E Job $ts"; description="created by PS E2E"; budget=100; city="Tehran" } @{ Authorization="Bearer $clientToken" }
$jobId = $null
if ($jobRes.job){ $jobId = ExtractId $jobRes.job }
if (-not $jobId -and $jobRes.data){ if ($jobRes.data.job){ $jobId = ExtractId $jobRes.data.job } if (-not $jobId){ $jobId = ExtractId $jobRes.data } }
if (-not $jobId){ $jobId = ExtractId $jobRes }
if (-not $jobId){ throw "No jobId: $(J $jobRes)" }
Write-Host "jobId=" $jobId

Write-Host "== Approve Job (admin) =="
$approveRes = Post "$API/v1/jobs/$jobId/approve" @{} @{ Authorization="Bearer $adminToken" }

Write-Host "== Apply Job (model) =="
$applyRes = Post "$API/v1/jobs/$jobId/apply" @{ message="Hi, I am interested." } @{ Authorization="Bearer $modelToken" }
$applicationId = $null
if ($applyRes.application){ $applicationId = ExtractId $applyRes.application }
if (-not $applicationId -and $applyRes.data){ $applicationId = ExtractId $applyRes.data }
if (-not $applicationId){ $applicationId = ExtractId $applyRes }
if (-not $applicationId){ throw "No applicationId: $(J $applyRes)" }
Write-Host "applicationId=" $applicationId

Write-Host "== Ensure Thread (model) =="
$threadRes = Post "$API/v1/threads/by-application" @{ applicationId=$applicationId } @{ Authorization="Bearer $modelToken" }
$threadId = $null
if ($threadRes.thread){ $threadId = ExtractId $threadRes.thread }
if (-not $threadId -and $threadRes.data){ $threadId = ExtractId $threadRes.data }
if (-not $threadId){ $threadId = ExtractId $threadRes }
if (-not $threadId){ throw "No threadId: $(J $threadRes)" }
Write-Host "threadId=" $threadId

Write-Host "== Send Message (model) =="
$sendRes = Post "$API/v1/messages" @{ threadId=$threadId; text="Hello from PS E2E $ts" } @{ Authorization="Bearer $modelToken" }

Write-Host "== Notifications (client) =="
$notifs = Invoke-RestMethod -Uri "$API/v1/notifications" -Headers @{ Authorization="Bearer $clientToken" }
$nCount = $notifs.items.Count

"--- SUMMARY ---"
@{
  client=$ClientEmail
  model=$ModelEmail
  admin=$AdminEmail
  jobId=$jobId
  applicationId=$applicationId
  threadId=$threadId
  lastMessage="Hello from PS E2E $ts"
  notificationsCount = $nCount
} | ConvertTo-Json -Depth 12
