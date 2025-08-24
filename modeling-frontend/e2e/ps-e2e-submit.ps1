param(
  [string]$API = "http://localhost:4000/api"
)

function J($o){ $o | ConvertTo-Json -Depth 12 }
function TryParse($s){ try { $s | ConvertFrom-Json } catch { $null } }
function Post($url,$body,$headers=@{}){
  try { Invoke-RestMethod -Uri $url -Method POST -ContentType "application/json" -Body (J $body) -Headers $headers }
  catch { $raw = $_.ErrorDetails.Message; $p = TryParse $raw; if ($p -ne $null){ return $p } else { throw $_ } }
}
function ExtractToken($res){ if ($null -ne $res.token){ return $res.token } if ($null -ne $res.data -and $null -ne $res.data.token){ return $res.data.token } return $null }
function ExtractId($obj){ if ($null -ne $obj._id){ return $obj._id } if ($null -ne $obj.id){ return $obj.id } return $null }

$ts = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
$client = @{ email="client.$ts@test.com"; password="Passw0rd!"; role="client"; name="Client $ts" }
$model  = @{ email="model.$ts@test.com";  password="Passw0rd!"; role="model" }
$admin  = @{ email="admin.$ts@test.com";  password="Passw0rd!"; role="admin" }

"== Register three roles =="
$clientRes = Post "$API/v1/auth/register" $client
$modelRes  = Post "$API/v1/auth/register" $model
$adminRes  = Post "$API/v1/auth/register" $admin

$clientToken = ExtractToken $clientRes
$modelToken  = ExtractToken $modelRes
$adminToken  = ExtractToken $adminRes
if (-not $clientToken -or -not $modelToken -or -not $adminToken){ throw "Auth failed" }

"== Create job (client) =="
$job = Post "$API/v1/jobs" @{ title="PS E2E $ts"; description="desc"; budget=100; city="Tehran" } @{ Authorization="Bearer $clientToken" }
$jobId = $null
if ($job.job){ $jobId = ExtractId $job.job }
if (-not $jobId -and $job.data){ if ($job.data.job){ $jobId = ExtractId $job.data.job }; if (-not $jobId){ $jobId = ExtractId $job.data } }
if (-not $jobId){ $jobId = ExtractId $job }
if (-not $jobId){ throw "No jobId: $(J $job)" }
"jobId = $jobId"

"== Submit (client) =="
$submit = Post "$API/v1/jobs/$jobId/submit" @{ termsAccepted = $true } @{ Authorization="Bearer $clientToken" }

"== Approve (admin) =="
$approve = Post "$API/v1/jobs/$jobId/approve" @{} @{ Authorization="Bearer $adminToken" }

"== Apply (model) =="
$apply = Post "$API/v1/jobs/$jobId/apply" @{ message="hi" } @{ Authorization="Bearer $modelToken" }
$applicationId = $null
if ($apply.application){ $applicationId = ExtractId $apply.application }
if (-not $applicationId -and $apply.data){ $applicationId = ExtractId $apply.data }
if (-not $applicationId){ $applicationId = ExtractId $apply }
if (-not $applicationId){ throw "No applicationId: $(J $apply)" }
"applicationId = $applicationId"

"== Thread by application (model) =="
$thread = Post "$API/v1/threads/by-application" @{ applicationId=$applicationId } @{ Authorization="Bearer $modelToken" }
$threadId = $null
if ($thread.thread){ $threadId = ExtractId $thread.thread }
if (-not $threadId -and $thread.data){ $threadId = ExtractId $thread.data }
if (-not $threadId){ $threadId = ExtractId $thread }
if (-not $threadId){ throw "No threadId: $(J $thread)" }
"threadId = $threadId"

"== Send message (model) =="
$send = Post "$API/v1/messages" @{ threadId=$threadId; text="Hello after approve $ts" } @{ Authorization="Bearer $modelToken" }

"== Notifications (client) =="
$notifs = Invoke-RestMethod -Uri "$API/v1/notifications" -Headers @{ Authorization="Bearer $clientToken" }
$nCount = $notifs.items.Count

"--- SUMMARY ---"
@{ jobId=$jobId; applicationId=$applicationId; threadId=$threadId; notifications=$nCount } | ConvertTo-Json -Depth 12
