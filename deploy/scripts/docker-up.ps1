#!/usr/bin/env pwsh
# Run full GeoInsight BD stack in Docker (infra + apps)
# Usage: .\deploy\scripts\docker-up.ps1
# Optional: .\deploy\scripts\docker-up.ps1 -Build   # only rebuild images when needed

param(
  [switch]$Build
)

$ErrorActionPreference = "Stop"
$Root = Resolve-Path (Join-Path $PSScriptRoot "..\..")

Set-Location $Root

function Get-EnvValue {
  param([string]$Name, [string]$Default)
  $match = Select-String -Path "$Root\.env" -Pattern "^\s*$([regex]::Escape($Name))\s*=" |
  Select-Object -Last 1
  if ($match) {
    return ($match.Line -split "=", 2)[1].Trim().Trim('"').Trim("'")
  }
  return $Default
}

if (-not (Test-Path "$Root\.env")) {
  Write-Host "Copy .env.example to .env first (local Windows)." -ForegroundColor Yellow
  Write-Host "  Do NOT use .env.production.example on this PC." -ForegroundColor Yellow
  exit 1
}

# Guard: production VPS .env accidentally used on Windows
$cors = Get-EnvValue "CORS_ORIGIN" ""
$pgPort = Get-EnvValue "POSTGRES_PORT" "55432"
if ($cors -match "187\.|YOUR_VPS|geoinsight\.gov") {
  Write-Host "ERROR: .env looks like PRODUCTION (CORS_ORIGIN=$cors)" -ForegroundColor Red
  Write-Host "  Local PC needs localhost URLs. Restore from .env.example:" -ForegroundColor White
  Write-Host "    Copy-Item .env.example .env -Force" -ForegroundColor Cyan
  Write-Host "  VPS keeps its own /opt/geoinsight-bd/.env separately." -ForegroundColor White
  exit 1
}
if ($pgPort -eq "5432") {
  Write-Host "NOTE: POSTGRES_PORT=5432 often fails on Windows Hyper-V. Prefer 55432." -ForegroundColor Yellow
}

$DashboardPort = [int](Get-EnvValue "DASHBOARD_PORT" "3600")
$ApiPort = [int](Get-EnvValue "API_GATEWAY_PORT" "4800")

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

function Invoke-DockerCompose {
  param([string[]]$Arguments)
  # Docker Compose writes progress to stderr; do not treat that as a PowerShell error.
  $prevEap = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  & docker compose -f docker-compose.yml -f docker-compose.apps.yml @Arguments 2>&1 |
  ForEach-Object {
    if ($_ -is [System.Management.Automation.ErrorRecord]) {
      Write-Host $_.ToString()
    }
    else {
      Write-Host $_
    }
  }
  $code = $LASTEXITCODE
  $ErrorActionPreference = $prevEap
  return $code
}

if (-not (Start-DockerDesktopIfNeeded)) {
  Write-Host ""
  Write-Host "ERROR: Docker Desktop is not running." -ForegroundColor Red
  Write-Host "  1. Open Docker Desktop manually and wait until it shows 'Running'" -ForegroundColor White
  Write-Host "  2. Run this script again: .\deploy\scripts\docker-up.ps1" -ForegroundColor White
  exit 1
}

# Stop local dev servers that block Docker ports
foreach ($port in @($DashboardPort, $ApiPort)) {
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

# Failed "recreate" leaves names like cda875fa563e_geoinsight-ai-analytics that block the next up.
function Clear-GeoInsightContainerConflicts {
  Write-Host "Clearing stuck/orphan GeoInsight containers (name conflicts)..." -ForegroundColor DarkGray
  $null = Invoke-DockerCompose -Arguments @("down", "--remove-orphans")
  $prevEap = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  $ids = @(docker ps -aq --filter "name=geoinsight" 2>$null)
  if ($ids.Count -gt 0) {
    docker rm -f @ids 2>$null | Out-Null
  }
  # Rename leftovers: hashprefix_geoinsight-*
  $stuck = docker ps -a --format "{{.ID}} {{.Names}}" 2>$null |
  Where-Object { $_ -match "geoinsight" }
  foreach ($line in $stuck) {
    $id = ($line -split "\s+")[0]
    if ($id) { docker rm -f $id 2>$null | Out-Null }
  }
  $ErrorActionPreference = $prevEap
}

$env:DOCKER_BUILDKIT = "1"
$env:COMPOSE_DOCKER_CLI_BUILD = "1"

Clear-GeoInsightContainerConflicts

Write-Host "Starting GeoInsight BD (Docker full stack)..." -ForegroundColor Cyan
Write-Host "  Dashboard port: $DashboardPort | API port: $ApiPort" -ForegroundColor DarkGray
Write-Host "  Tip: AI image uses CPU torch + BuildKit pip cache (no CUDA re-download)." -ForegroundColor DarkGray
Write-Host "  Tip: Prefer MINIO_API_PORT=19000 in .env if port 9000 is Hyper-V blocked." -ForegroundColor DarkGray

$composeArgs = @("up", "-d")
if ($Build.IsPresent) {
  $composeArgs += "--build"
  Write-Host "  Running with --build because -Build was passed." -ForegroundColor DarkGray
}
else {
  Write-Host "  Running without --build for faster startup." -ForegroundColor DarkGray
}

$composeExit = Invoke-DockerCompose -Arguments $composeArgs
if ($composeExit -ne 0) {
  Write-Host ""
  Write-Host "Retrying after force-cleaning name conflicts..." -ForegroundColor Yellow
  Clear-GeoInsightContainerConflicts
  $composeExit = Invoke-DockerCompose -Arguments $composeArgs
}
if ($composeExit -ne 0) {
  Write-Host ""
  Write-Host "ERROR: docker compose failed (exit $composeExit). Check logs:" -ForegroundColor Red
  Write-Host "  docker compose -f docker-compose.yml -f docker-compose.apps.yml logs --tail 50" -ForegroundColor White
  Write-Host ""
  Write-Host "Windows Hyper-V often reserves ports 4000, 8000, 6379, 6432." -ForegroundColor Yellow
  Write-Host "  Keep API_GATEWAY_PORT=4800 in .env (already set)." -ForegroundColor Yellow
  exit $composeExit
}

Write-Host ""
Write-Host "Waiting for services to become healthy..." -ForegroundColor DarkGray
$deadline = (Get-Date).AddMinutes(3)
$ready = $false
while ((Get-Date) -lt $deadline) {
  try {
    $health = Invoke-RestMethod -Uri "http://localhost:$ApiPort/api/v1/health" -TimeoutSec 5
    if ($health.status -eq "healthy") {
      $ready = $true
      break
    }
  }
  catch {
    # still starting
  }
  Start-Sleep -Seconds 3
}

Write-Host ""
if ($ready) {
  Write-Host "All core services are up." -ForegroundColor Green
}
else {
  Write-Host "WARNING: API health check timed out - containers may still be starting." -ForegroundColor Yellow
  Write-Host "  docker compose -f docker-compose.yml -f docker-compose.apps.yml logs api-gateway --tail 30" -ForegroundColor White
}

Write-Host ""
Write-Host "Dashboard:  http://localhost:$DashboardPort  (open this in browser)" -ForegroundColor Green
Write-Host "API:        http://localhost:$ApiPort/api/v1/health" -ForegroundColor Green
Write-Host "AI:         internal ai-analytics:8000 (via API gateway)" -ForegroundColor Green
Write-Host 'Login:      pmo@geoinsight.gov.bd / ChangeMe@123' -ForegroundColor Green
Write-Host ""
docker compose -f docker-compose.yml -f docker-compose.apps.yml ps
