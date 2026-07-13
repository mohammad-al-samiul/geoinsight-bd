#!/usr/bin/env bash
# GeoInsight BD — redeploy on VPS (used by CI/CD + manual)
# Survives SSH drop: builds first, then detaches with up -d
# Usage (from /opt/geoinsight-bd):
#   bash deploy/scripts/vps-redeploy.sh
set -euo pipefail

DEPLOY_PATH="${DEPLOY_PATH:-$(cd "$(dirname "$0")/../.." && pwd)}"
cd "$DEPLOY_PATH"

export COMPOSE_HTTP_TIMEOUT="${COMPOSE_HTTP_TIMEOUT:-300}"
export DOCKER_CLIENT_TIMEOUT="${DOCKER_CLIENT_TIMEOUT:-300}"
COMPOSE=(docker compose -f docker-compose.yml -f docker-compose.apps.yml)

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

echo "==> Building images (this can take 10–20 min; keep SSH open or use tmux)..."
"${COMPOSE[@]}" build api-gateway ai-analytics dashboard-nextjs pgbouncer

echo "==> Starting stack (detached)..."
"${COMPOSE[@]}" up -d --remove-orphans

echo "==> Waiting for containers..."
sleep 8
"${COMPOSE[@]}" ps

echo "==> Waiting for API health (up to ~3 min)..."
for i in $(seq 1 36); do
  if docker exec geoinsight-api-gateway wget -qO- http://127.0.0.1:4000/api/v1/health >/dev/null 2>&1; then
    echo "==> API healthy"
    break
  fi
  if [[ "$i" -eq 36 ]]; then
    echo "WARN: API not healthy yet. Check:"
    echo "  docker logs geoinsight-api-gateway --tail 80"
    echo "  docker logs geoinsight-ai-analytics --tail 80"
    echo "  docker ps -a"
  fi
  sleep 5
done

"${COMPOSE[@]}" ps
echo "==> Redeploy done."
echo "    Dashboard: use NEXT_PUBLIC / CORS host from .env (port 3000)"
echo "    API health: curl -s http://127.0.0.1:4800/api/v1/health"
