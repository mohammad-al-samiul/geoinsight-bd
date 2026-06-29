# Stop full GeoInsight BD Docker stack
$Root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $Root
docker compose -f docker-compose.yml -f docker-compose.apps.yml down
