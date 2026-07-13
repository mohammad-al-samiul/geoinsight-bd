#!/usr/bin/env bash
# GeoInsight BD — redeploy on VPS (used by CI/CD + manual)
#
# Hostinger Browser Terminal drops long SSH sessions ("Lost connection to the server").
# Default: start deploy in background + log file, then exit immediately.
#
# Usage (from /opt/geoinsight-bd):
#   bash deploy/scripts/vps-redeploy.sh              # background (recommended)
#   bash deploy/scripts/vps-redeploy.sh --foreground # watch live (SSH client only)
#   bash deploy/scripts/vps-redeploy.sh --status     # show log / running state
#
# Watch progress:
#   tail -f /opt/geoinsight-bd/logs/redeploy.log
set -euo pipefail

DEPLOY_PATH="${DEPLOY_PATH:-$(cd "$(dirname "$0")/../.." && pwd)}"
SCRIPT_PATH="$(cd "$(dirname "$0")" && pwd)/$(basename "$0")"
LOG_DIR="${DEPLOY_PATH}/logs"
LOG_FILE="${LOG_DIR}/redeploy.log"
PID_FILE="${LOG_DIR}/redeploy.pid"
MODE="${1:-}"

ensure_swap() {
  if swapon --show 2>/dev/null | grep -q .; then
    return 0
  fi
  if [[ ! -f /swapfile ]]; then
    echo "==> Adding 4G swap (prevents OOM during Docker build)..."
    fallocate -l 4G /swapfile 2>/dev/null || dd if=/dev/zero of=/swapfile bs=1M count=4096
    chmod 600 /swapfile
    mkswap /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
  fi
  swapon /swapfile 2>/dev/null || true
}

show_status() {
  echo "==> Log: $LOG_FILE"
  if [[ -f "$PID_FILE" ]]; then
    local pid
    pid="$(cat "$PID_FILE" 2>/dev/null || true)"
    if [[ -n "${pid:-}" ]] && kill -0 "$pid" 2>/dev/null; then
      echo "==> Redeploy RUNNING (pid $pid)"
    else
      echo "==> No active redeploy process (last run finished or crashed)"
    fi
  else
    echo "==> No active redeploy process"
  fi
  if [[ -f "$LOG_FILE" ]]; then
    echo "==> Last 40 log lines:"
    tail -n 40 "$LOG_FILE"
  fi
}

run_deploy() {
  cd "$DEPLOY_PATH"
  ensure_swap

  export COMPOSE_HTTP_TIMEOUT="${COMPOSE_HTTP_TIMEOUT:-300}"
  export DOCKER_CLIENT_TIMEOUT="${DOCKER_CLIENT_TIMEOUT:-300}"
  COMPOSE=(docker compose -f docker-compose.yml -f docker-compose.apps.yml)

  if [[ ! -f .env ]]; then
    echo "ERROR: .env missing in $DEPLOY_PATH"
    exit 1
  fi

  echo "==> Deploy path: $DEPLOY_PATH"
  echo "==> Started at: $(date -Is)"
  echo "==> Pulling latest git (if remote configured)..."
  if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    git fetch --all --prune || true
    git pull --ff-only origin main || git pull --ff-only || true
  fi

  echo "==> Building images (this can take 10–20 min)..."
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
  echo "==> Redeploy done at: $(date -Is)"
  echo "    Dashboard: use NEXT_PUBLIC / CORS host from .env (port 3000)"
  echo "    API health: curl -s http://127.0.0.1:4800/api/v1/health"
}

start_background() {
  mkdir -p "$LOG_DIR"
  if [[ -f "$PID_FILE" ]]; then
    local old
    old="$(cat "$PID_FILE" 2>/dev/null || true)"
    if [[ -n "${old:-}" ]] && kill -0 "$old" 2>/dev/null; then
      echo "==> Redeploy already running (pid $old)"
      echo "    Watch:  tail -f $LOG_FILE"
      echo "    Status: bash $SCRIPT_PATH --status"
      exit 0
    fi
  fi

  : >"$LOG_FILE"
  echo "==> Hostinger terminal disconnects on long builds — starting in BACKGROUND."
  echo "==> Log: $LOG_FILE"
  nohup env DEPLOY_PATH="$DEPLOY_PATH" GEOINSIGHT_REDEPLOY_WORKER=1 \
    bash "$SCRIPT_PATH" --worker >>"$LOG_FILE" 2>&1 &
  echo $! >"$PID_FILE"
  disown || true
  echo "==> Started pid $(cat "$PID_FILE")"
  echo ""
  echo "You can close this terminal now. Check later with:"
  echo "  tail -f $LOG_FILE"
  echo "  bash deploy/scripts/vps-redeploy.sh --status"
  echo ""
  echo "When log shows 'Redeploy done' — finished."
}

# --- entry ---
case "$MODE" in
  --status|-s)
    show_status
    exit 0
    ;;
  --worker)
    run_deploy
    rm -f "$PID_FILE"
    exit 0
    ;;
  --foreground|-f)
    export GEOINSIGHT_REDEPLOY_WORKER=1
    run_deploy
    exit 0
    ;;
  --help|-h)
    echo "Usage: bash deploy/scripts/vps-redeploy.sh [--foreground|--status]"
    exit 0
    ;;
esac

# CI / already-a-worker / non-interactive: run inline
if [[ -n "${GEOINSIGHT_REDEPLOY_WORKER:-}" || ! -t 0 ]]; then
  run_deploy
  exit 0
fi

# Interactive (Hostinger Browser Terminal): never hold the connection open
start_background
