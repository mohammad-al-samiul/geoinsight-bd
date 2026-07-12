#!/usr/bin/env bash
# GeoInsight BD — redeploy on VPS (used by CI/CD + manual)
# Usage (from /opt/geoinsight-bd):
#   bash deploy/scripts/vps-redeploy.sh
set -euo pipefail

DEPLOY_PATH="${DEPLOY_PATH:-$(cd "$(dirname "$0")/../.." && pwd)}"
cd "$DEPLOY_PATH"

if [[ ! -f .env ]]; then
  echo "ERROR: .env missing in $DEPLOY_PATH"
  exit 1
fi

echo "==> Deploy path: $DEPLOY_PATH"
echo "==> Pulling latest git (if remote configured)..."
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  git fetch --all --prune || true
  git pull --ff-only origin main || git pull --ff-only || true
fi

echo "==> Building & restarting stack..."
docker compose -f docker-compose.yml -f docker-compose.apps.yml up -d --build --remove-orphans

echo "==> Waiting for API health..."
for i in $(seq 1 40); do
  if docker compose -f docker-compose.yml -f docker-compose.apps.yml exec -T api-gateway \
    wget -qO- http://127.0.0.1:4000/api/v1/health >/dev/null 2>&1; then
    echo "==> API healthy"
    break
  fi
  if [[ "$i" -eq 40 ]]; then
    echo "WARN: API health check timed out — check: docker logs geoinsight-api-gateway --tail 80"
  fi
  sleep 5
done

docker compose -f docker-compose.yml -f docker-compose.apps.yml ps
echo "==> Redeploy done."
