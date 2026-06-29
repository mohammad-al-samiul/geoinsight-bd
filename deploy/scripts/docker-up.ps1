# Run full GeoInsight BD stack in Docker (infra + apps)
# Usage: .\deploy\scripts\docker-up.ps1

$ErrorActionPreference = "Stop"
$Root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
if (-not (Test-Path "$Root\.env")) {
  Write-Host "Copy .env.example to .env first." -ForegroundColor Yellow
  exit 1
}

Set-Location $Root

# Stop local dev servers that block Docker ports (optional)
foreach ($port in @(3000, 4000, 8000)) {
  $conns = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
  foreach ($conn in $conns) {
    $proc = Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue
    if ($proc -and ($proc.ProcessName -in @("node", "python", "python3"))) {
      Write-Host "Stopping $($proc.ProcessName) on port $port (PID $($proc.Id))..."
      Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
    }
  }
}
Start-Sleep -Seconds 2

Write-Host "Starting GeoInsight BD (Docker full stack)..." -ForegroundColor Cyan
docker compose -f docker-compose.yml -f docker-compose.apps.yml up -d --build

Write-Host ""
Write-Host "Dashboard:  http://localhost:3000" -ForegroundColor Green
Write-Host "API:        http://localhost:4000/api/v1/health" -ForegroundColor Green
Write-Host "AI:         http://localhost:8000/api/v1/health" -ForegroundColor Green
Write-Host "Login:      pmo@geoinsight.gov.bd / ChangeMe@123" -ForegroundColor Green
Write-Host ""
docker compose -f docker-compose.yml -f docker-compose.apps.yml ps
