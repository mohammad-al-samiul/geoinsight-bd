# Run full GeoInsight BD stack in Docker (infra + apps)
# Usage: .\deploy\scripts\docker-up.ps1

$ErrorActionPreference = "Stop"
$Root = Resolve-Path (Join-Path $PSScriptRoot "..\..")

if (-not (Test-Path "$Root\.env")) {
  Write-Host "Copy .env.example to .env first." -ForegroundColor Yellow
  exit 1
}

Set-Location $Root

function Test-DockerDaemon {
  docker info *> $null
  return $LASTEXITCODE -eq 0
}

function Start-DockerDesktopIfNeeded {
  if (Test-DockerDaemon) { return $true }

  Write-Host "Docker is not running. Trying to start Docker Desktop..." -ForegroundColor Yellow
  $candidates = @(
    "${env:ProgramFiles}\Docker\Docker\Docker Desktop.exe",
    "${env:LocalAppData}\Docker\Docker Desktop.exe"
  )
  foreach ($exe in $candidates) {
    if (Test-Path $exe) {
      Start-Process -FilePath $exe | Out-Null
      break
    }
  }

  $deadline = (Get-Date).AddMinutes(3)
  while ((Get-Date) -lt $deadline) {
    Start-Sleep -Seconds 4
    if (Test-DockerDaemon) {
      Write-Host "Docker Desktop is ready." -ForegroundColor Green
      return $true
    }
    Write-Host "Waiting for Docker Desktop..." -ForegroundColor DarkYellow
  }
  return $false
}

if (-not (Start-DockerDesktopIfNeeded)) {
  Write-Host ""
  Write-Host "ERROR: Docker Desktop is not running." -ForegroundColor Red
  Write-Host "  1. Open Docker Desktop manually and wait until it shows 'Running'" -ForegroundColor White
  Write-Host "  2. Run this script again: .\deploy\scripts\docker-up.ps1" -ForegroundColor White
  exit 1
}

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
if ($LASTEXITCODE -ne 0) {
  Write-Host ""
  Write-Host "ERROR: docker compose failed. Check logs:" -ForegroundColor Red
  Write-Host "  docker compose -f docker-compose.yml -f docker-compose.apps.yml logs --tail 50" -ForegroundColor White
  exit $LASTEXITCODE
}

Write-Host ""
Write-Host "Dashboard:  http://localhost:3000  (open this in browser)" -ForegroundColor Green
Write-Host "API:        http://localhost:4000/api/v1/health" -ForegroundColor Green
Write-Host "AI:         http://localhost:8000/api/v1/health" -ForegroundColor Green
Write-Host "Login:      pmo@geoinsight.gov.bd / ChangeMe@123" -ForegroundColor Green
Write-Host ""
docker compose -f docker-compose.yml -f docker-compose.apps.yml ps
