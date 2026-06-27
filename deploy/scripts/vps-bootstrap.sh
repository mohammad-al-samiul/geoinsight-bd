#!/usr/bin/env bash
# GeoInsight BD — VPS bootstrap (run once on Ubuntu 22.04+)
set -euo pipefail

DEPLOY_PATH="${1:-/opt/geoinsight-bd}"
DEPLOY_USER="${2:-deploy}"

echo "==> Creating deploy path: $DEPLOY_PATH"
sudo mkdir -p "$DEPLOY_PATH"
sudo chown -R "$DEPLOY_USER:$DEPLOY_USER" "$DEPLOY_PATH"

echo "==> Installing Docker (if missing)"
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
  sudo usermod -aG docker "$DEPLOY_USER"
fi

echo "==> Installing Docker Compose plugin (if missing)"
if ! docker compose version >/dev/null 2>&1; then
  sudo apt-get update
  sudo apt-get install -y docker-compose-plugin
fi

echo "==> Copy .env from .env.example and configure secrets before first CI deploy"
echo "    Path: $DEPLOY_PATH/.env"
echo "Done. Re-login so docker group membership applies."
