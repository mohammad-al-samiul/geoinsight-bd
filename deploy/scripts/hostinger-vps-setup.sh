#!/usr/bin/env bash
# GeoInsight BD — Hostinger VPS one-shot setup (Ubuntu 22.04/24.04)
# Run as root from Hostinger Browser Terminal if SSH password fails:
#   bash <(curl -fsSL ...)  OR  paste this script after cloning.
#
# Usage:
#   export VPS_IP=187.127.185.67
#   export GIT_REPO=https://github.com/<you>/geoinsight-bd.git   # or upload via scp
#   bash deploy/scripts/hostinger-vps-setup.sh
set -euo pipefail

VPS_IP="${VPS_IP:-$(curl -fsS ifconfig.me || hostname -I | awk '{print $1}')}"
DEPLOY_PATH="${DEPLOY_PATH:-/opt/geoinsight-bd}"
GIT_REPO="${GIT_REPO:-}"
PUBLIC_KEY="${PUBLIC_KEY:-}"

echo "==> Host: $VPS_IP"
echo "==> Deploy path: $DEPLOY_PATH"

export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq curl git ufw ca-certificates

if ! command -v docker >/dev/null 2>&1; then
  echo "==> Installing Docker"
  curl -fsSL https://get.docker.com | sh
fi
systemctl enable --now docker
docker compose version >/dev/null

# Optional: install deploy SSH public key for CI / laptop access
if [[ -n "$PUBLIC_KEY" ]]; then
  mkdir -p /root/.ssh
  chmod 700 /root/.ssh
  grep -qxF "$PUBLIC_KEY" /root/.ssh/authorized_keys 2>/dev/null || echo "$PUBLIC_KEY" >> /root/.ssh/authorized_keys
  chmod 600 /root/.ssh/authorized_keys
  echo "==> Public key installed for root"
fi

# Ensure PasswordAuthentication stays usable from console if needed
sed -i 's/^#\?PermitRootLogin.*/PermitRootLogin yes/' /etc/ssh/sshd_config || true
sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication yes/' /etc/ssh/sshd_config || true
systemctl reload ssh || systemctl reload sshd || true

ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 3000/tcp
ufw allow 4800/tcp
ufw --force enable || true

mkdir -p "$DEPLOY_PATH"
cd "$DEPLOY_PATH"

if [[ ! -f docker-compose.yml ]]; then
  if [[ -n "$GIT_REPO" ]]; then
    echo "==> Cloning $GIT_REPO"
    git clone "$GIT_REPO" .
  else
    echo "ERROR: No project files in $DEPLOY_PATH and GIT_REPO not set."
    echo "Upload the repo (scp/rsync) or set GIT_REPO=https://github.com/..."
    exit 1
  fi
fi

if [[ ! -f .env ]]; then
  # Prefer production template on VPS (local Windows uses .env.example)
  if [[ -f .env.production.example ]]; then
    cp .env.production.example .env
  else
    cp .env.example .env
  fi
  # Bind public URLs to this VPS IP (override after domain is ready)
  sed -i "s|^NEXT_PUBLIC_API_URL=.*|NEXT_PUBLIC_API_URL=http://${VPS_IP}:4800/api/v1|" .env
  sed -i "s|^NEXT_PUBLIC_SOCKET_URL=.*|NEXT_PUBLIC_SOCKET_URL=http://${VPS_IP}:4800|" .env
  sed -i "s|^API_GATEWAY_URL=.*|API_GATEWAY_URL=http://${VPS_IP}:4800|" .env
  sed -i "s|^CORS_ORIGIN=.*|CORS_ORIGIN=http://${VPS_IP}:3000|" .env
  sed -i "s|^CORS_ORIGINS=.*|CORS_ORIGINS=http://${VPS_IP}:3000,http://${VPS_IP}:4800|" .env
  sed -i "s|^API_GATEWAY_PORT=.*|API_GATEWAY_PORT=4800|" .env
  sed -i "s|^DASHBOARD_PORT=.*|DASHBOARD_PORT=3000|" .env
  echo "==> Created .env — review secrets before going public"
  echo "    NOTE: Postgres password is baked into the volume on first start."
  echo "    If you change POSTGRES_PASSWORD later, wipe volumes (see vps-reset-db.sh)."
fi

# Swap helps small Hostinger plans during image build
if [[ ! -f /swapfile ]]; then
  echo "==> Adding 4G swap (for Docker builds)"
  fallocate -l 4G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=4096
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

echo "==> Building & starting stack (background — Hostinger terminal-safe)"
echo "    Prefer: bash deploy/scripts/vps-redeploy.sh"
chmod +x deploy/scripts/vps-redeploy.sh deploy/scripts/docker-db-init.sh 2>/dev/null || true
bash deploy/scripts/vps-redeploy.sh --foreground

echo ""
echo "If browser terminal dropped mid-build, reconnect and:"
echo "  bash $DEPLOY_PATH/deploy/scripts/vps-redeploy.sh --status"
echo "  tail -f $DEPLOY_PATH/logs/redeploy.log"
echo "Or restart: cd $DEPLOY_PATH && bash deploy/scripts/vps-redeploy.sh"
echo "  docker ps -a"
echo "  docker logs geoinsight-ai-analytics --tail 50"
echo ""
echo "Done."
echo "  Dashboard: http://${VPS_IP}:3000"
echo "  API:       http://${VPS_IP}:4800/api/v1/health"
echo "Login (default seed): pmo@geoinsight.gov.bd / ChangeMe@123"
echo "Change root password + seed login immediately."
echo ""
echo "CI/CD: add GitHub secrets VPS_HOST, VPS_USER, VPS_SSH_KEY then push to main."
