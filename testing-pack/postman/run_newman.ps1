param(
  [string]$ApiBase = $env:API_BASE_URL
)

if (-not $ApiBase) { $ApiBase = "http://localhost:4000/api" }

Write-Host "[+] Running Newman against $ApiBase"

newman run ".\postman\modeling_api_collection.json" `
  --reporters cli,htmlextra `
  --reporter-htmlextra-export ".\artifacts\newman-report.html" `
  --env-var "API_BASE_URL=$ApiBase" `
  --env-var "CLIENT_EMAIL=$env:CLIENT_EMAIL" `
  --env-var "CLIENT_PASSWORD=$env:CLIENT_PASSWORD"
