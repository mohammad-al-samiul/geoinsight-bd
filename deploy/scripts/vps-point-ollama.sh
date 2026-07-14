#!/usr/bin/env bash
# Point the APP VPS ai-analytics service at a remote Ollama server
#
# Usage (on app VPS):
#   bash deploy/scripts/vps-point-ollama.sh http://10.0.0.5:11434
#   bash deploy/scripts/vps-point-ollama.sh http://10.0.0.5:11434 llama3.1:8b
#
set -euo pipefail

OLLAMA_URL_ARG="${1:-}"
MODEL_ARG="${2:-llama3.1:8b}"

if [[ -z "$OLLAMA_URL_ARG" ]]; then
  echo "Usage: bash deploy/scripts/vps-point-ollama.sh http://AI_SERVER_IP:11434 [model]"
  exit 1
fi

DEPLOY_PATH="${DEPLOY_PATH:-$(cd "$(dirname "$0")/../.." && pwd)}"
cd "$DEPLOY_PATH"

if [[ ! -f .env ]]; then
  echo "ERROR: .env missing in $DEPLOY_PATH"
  exit 1
fi

backup=".env.bak.ollama.$(date +%Y%m%d%H%M%S)"
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

patch_kv LLM_PROVIDER ollama
patch_kv OLLAMA_URL "$OLLAMA_URL_ARG"
patch_kv OLLAMA_MODEL "$MODEL_ARG"
# Keep sentiment mock on app VPS — BERT belongs on a big box if needed
patch_kv SENTIMENT_USE_MOCK true

echo "==> Verifying Ollama reachable from this host..."
if curl -fsS --connect-timeout 5 "${OLLAMA_URL_ARG}/api/tags" >/dev/null 2>&1; then
  echo "==> Reachable: $OLLAMA_URL_ARG"
else
  echo "WARN: cannot reach ${OLLAMA_URL_ARG}/api/tags from this VPS."
  echo "      Check firewall / private network / Ollama OLLAMA_HOST=0.0.0.0"
fi

COMPOSE=(docker compose -f docker-compose.yml -f docker-compose.apps.yml)
if [[ -f docker-compose.vps.yml ]]; then
  COMPOSE+=(-f docker-compose.vps.yml)
fi

echo "==> Recreating ai-analytics with remote Ollama..."
"${COMPOSE[@]}" up -d --no-deps --force-recreate ai-analytics

echo "==> Waiting for AI health..."
for i in $(seq 1 24); do
  if docker exec geoinsight-ai-analytics \
    python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/api/v1/health')" \
    >/dev/null 2>&1; then
    echo "==> ai-analytics healthy"
    break
  fi
  sleep 5
done

echo "==> Sovereign LLM status (from inside AI container):"
docker exec geoinsight-ai-analytics \
  python -c "import os,urllib.request; print(urllib.request.urlopen('http://127.0.0.1:8000/api/v1/sovereign-llm/status').read().decode())" \
  2>/dev/null || \
docker exec geoinsight-ai-analytics \
  python -c "import urllib.request; print(urllib.request.urlopen('http://127.0.0.1:8000/api/v1/sovereign/status').read().decode())" \
  2>/dev/null || echo "(status endpoint not ready yet — check logs)"

echo ""
echo "Done. Dashboard Sovereign AI should now use: $OLLAMA_URL_ARG ($MODEL_ARG)"
