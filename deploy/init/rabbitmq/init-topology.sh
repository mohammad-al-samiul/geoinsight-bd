#!/bin/sh
set -eu

RABBIT_HOST="${RABBITMQ_HOST:-rabbitmq}"
RABBIT_USER="${RABBITMQ_DEFAULT_USER:?RABBITMQ_DEFAULT_USER is required}"
RABBIT_PASS="${RABBITMQ_DEFAULT_PASS:?RABBITMQ_DEFAULT_PASS is required}"
DEFINITIONS_FILE="${RABBITMQ_DEFINITIONS_FILE:-/definitions/definitions.json}"
MGMT_URL="http://${RABBIT_HOST}:15672/api/definitions"

echo "[rabbitmq-init] Waiting for RabbitMQ management API at ${RABBIT_HOST}..."
until curl -fsS -u "${RABBIT_USER}:${RABBIT_PASS}" \
  "http://${RABBIT_HOST}:15672/api/overview" >/dev/null; do
  sleep 2
done

echo "[rabbitmq-init] Importing topology from ${DEFINITIONS_FILE}"
curl -fsS -u "${RABBIT_USER}:${RABBIT_PASS}" \
  -H "Content-Type: application/json" \
  -X POST "${MGMT_URL}" \
  --data-binary "@${DEFINITIONS_FILE}"

echo "[rabbitmq-init] Topology imported successfully."
