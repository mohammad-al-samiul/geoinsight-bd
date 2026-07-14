#!/usr/bin/env bash
# GeoInsight BD — wipe DB/MQ/MinIO volumes so they re-init from current .env
# Use when: Prisma P1000 auth failed, or you changed POSTGRES_*/RABBITMQ_*/MINIO_* passwords
# after the first docker up.
#
# WARNING: Deletes Postgres, Redis, RabbitMQ, MinIO data. First-deploy / empty VPS only.
#
# Usage (from /opt/geoinsight-bd):
#   bash deploy/scripts/vps-reset-db.sh
#   bash deploy/scripts/vps-redeploy.sh
set -euo pipefail

DEPLOY_PATH="${DEPLOY_PATH:-$(cd "$(dirname "$0")/../.." && pwd)}"
cd "$DEPLOY_PATH"

COMPOSE=(docker compose -f docker-compose.yml -f docker-compose.apps.yml)

if [[ ! -f .env ]]; then
  echo "ERROR: .env missing in $DEPLOY_PATH"
  exit 1
fi

echo "==> This will DELETE volumes (Postgres / Redis / RabbitMQ / MinIO data)."
echo "    Deploy path: $DEPLOY_PATH"
echo "    Current POSTGRES_USER=$(grep -E '^POSTGRES_USER=' .env | cut -d= -f2- || true)"
read -r -p "Type YES to continue: " confirm
if [[ "$confirm" != "YES" ]]; then
  echo "Aborted."
  exit 1
fi

echo "==> Stopping stack + removing named volumes..."
"${COMPOSE[@]}" down -v --remove-orphans

echo "==> Starting infra + apps from current .env..."
bash "$DEPLOY_PATH/deploy/scripts/vps-redeploy.sh"

echo "==> Reset + redeploy finished."
echo "    Dashboard container name is: geoinsight-dashboard"
echo "    Logs: docker logs geoinsight-dashboard --tail 50"
echo "          docker logs geoinsight-db-migrate --tail 50"
