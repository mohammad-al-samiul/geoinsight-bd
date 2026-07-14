#!/usr/bin/env bash
# Quick VPS performance patch (no rebuild) — apply optimized .env flags + drop replica
# Usage (from /opt/geoinsight-bd):
#   bash deploy/scripts/vps-optimize-env.sh
set -euo pipefail

DEPLOY_PATH="${DEPLOY_PATH:-$(cd "$(dirname "$0")/../.." && pwd)}"
cd "$DEPLOY_PATH"

if [[ ! -f .env ]]; then
  echo "ERROR: .env missing"
  exit 1
fi

backup=".env.bak.$(date +%Y%m%d%H%M%S)"
cp .env "$backup"
echo "==> Backed up .env → $backup"

patch_kv() {
  local key="$1"
  local val="$2"
  if grep -qE "^${key}=" .env; then
    sed -i "s|^${key}=.*|${key}=${val}|" .env
  else
    echo "${key}=${val}" >> .env
  fi
}

patch_kv INGESTION_RUN_ON_START false
patch_kv PIPELINE_RUN_ON_START false
patch_kv INGESTION_STARTUP_DELAY_MS 120000
patch_kv PIPELINE_STARTUP_DELAY_MS 180000
patch_kv SENTIMENT_USE_MOCK true
patch_kv HF_HUB_OFFLINE 1
patch_kv TRANSFORMERS_OFFLINE 1
patch_kv AI_WORKER_POOL_SIZE 1

echo "==> Stopping postgres-replica (if any)..."
docker stop geoinsight-postgres-replica 2>/dev/null || true
docker rm geoinsight-postgres-replica 2>/dev/null || true

COMPOSE=(docker compose -f docker-compose.yml -f docker-compose.apps.yml -f docker-compose.vps.yml)

echo "==> Recreating gateway / AI / pgbouncer with slim profile..."
"${COMPOSE[@]}" up -d --no-deps --force-recreate pgbouncer api-gateway ai-analytics dashboard-nextjs

echo "==> Done. Verify:"
echo "  docker stats --no-stream"
echo "  curl -s http://127.0.0.1:4800/api/v1/health"
echo "Full code optimize (cache + slim compose): bash deploy/scripts/vps-redeploy.sh --force"
