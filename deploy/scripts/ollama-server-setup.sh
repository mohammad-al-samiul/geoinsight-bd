#!/usr/bin/env bash
# Install & start GeoInsight Ollama on a dedicated AI server
#
# Usage (on the AI machine):
#   cd /opt/geoinsight-bd   # or clone path
#   bash deploy/scripts/ollama-server-setup.sh
#   bash deploy/scripts/ollama-server-setup.sh --allow-from 187.127.185.67
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

ALLOW_FROM=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --allow-from)
      ALLOW_FROM="${2:-}"
      shift 2
      ;;
    *)
      echo "Unknown arg: $1"
      exit 1
      ;;
  esac
done

if [[ ! -f .env.ollama ]]; then
  cp .env.ollama.example .env.ollama
  echo "==> Created .env.ollama from example"
fi

# shellcheck disable=SC1091
set -a
# shellcheck source=/dev/null
source .env.ollama
set +a

MODEL="${OLLAMA_MODEL:-gpt-oss:20b}"
PORT="${OLLAMA_PORT:-11434}"

echo "==> Starting Ollama container on :$PORT ..."
docker compose -f docker-compose.ollama.yml --env-file .env.ollama up -d

echo "==> Waiting for Ollama API..."
for i in $(seq 1 30); do
  if curl -fsS "http://127.0.0.1:${PORT}/api/tags" >/dev/null 2>&1; then
    echo "==> Ollama is up"
    break
  fi
  if [[ "$i" -eq 30 ]]; then
    echo "ERROR: Ollama did not become ready. Check: docker logs geoinsight-ollama"
    exit 1
  fi
  sleep 2
done

echo "==> Pulling model: $MODEL (may take several minutes)..."
docker exec geoinsight-ollama ollama pull "$MODEL"

echo "==> Installed models:"
docker exec geoinsight-ollama ollama list

if command -v ufw >/dev/null 2>&1; then
  if [[ -n "$ALLOW_FROM" ]]; then
    echo "==> UFW: allow TCP $PORT from $ALLOW_FROM only"
    ufw allow from "$ALLOW_FROM" to any port "$PORT" proto tcp comment "GeoInsight Ollama" || true
    ufw status | grep -E "$PORT|Status" || true
  else
    echo "==> TIP: lock Ollama to your app VPS IP:"
    echo "    bash deploy/scripts/ollama-server-setup.sh --allow-from <APP_VPS_IP>"
    echo "  (do NOT leave :11434 open to the whole internet)"
  fi
fi

IP="$(hostname -I 2>/dev/null | awk '{print $1}')"
IP="${IP:-<AI_SERVER_IP>}"

echo ""
echo "==> Ollama server ready."
echo "    Local check:  curl -s http://127.0.0.1:${PORT}/api/tags"
echo ""
echo "On the APP VPS (/opt/geoinsight-bd/.env) set:"
echo "    LLM_PROVIDER=ollama"
echo "    OLLAMA_URL=http://${IP}:${PORT}"
echo "    OLLAMA_MODEL=${MODEL}"
echo "    SENTIMENT_USE_MOCK=true"
echo ""
echo "Then recreate AI container:"
echo "    bash deploy/scripts/vps-point-ollama.sh http://${IP}:${PORT}"
echo ""
