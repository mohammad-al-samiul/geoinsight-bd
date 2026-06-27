#!/bin/sh
set -eu

MINIO_ALIAS="${MINIO_ALIAS:-geoinsight}"
MINIO_ENDPOINT="${MINIO_ENDPOINT:-http://minio:9000}"
MINIO_ROOT_USER="${MINIO_ROOT_USER:?MINIO_ROOT_USER is required}"
MINIO_ROOT_PASSWORD="${MINIO_ROOT_PASSWORD:?MINIO_ROOT_PASSWORD is required}"
MINIO_BUCKET_DOCS="${MINIO_BUCKET_DOCS:-national-intelligence-docs}"

echo "[minio-init] Waiting for MinIO at ${MINIO_ENDPOINT}..."
until mc alias set "${MINIO_ALIAS}" "${MINIO_ENDPOINT}" "${MINIO_ROOT_USER}" "${MINIO_ROOT_PASSWORD}" >/dev/null 2>&1; do
  sleep 2
done

echo "[minio-init] Ensuring private bucket: ${MINIO_BUCKET_DOCS}"
if mc ls "${MINIO_ALIAS}/${MINIO_BUCKET_DOCS}" >/dev/null 2>&1; then
  echo "[minio-init] Bucket already exists."
else
  mc mb --with-lock "${MINIO_ALIAS}/${MINIO_BUCKET_DOCS}"
fi

# Private bucket: deny anonymous read; only authenticated credentials may access objects.
mc anonymous set none "${MINIO_ALIAS}/${MINIO_BUCKET_DOCS}"

echo "[minio-init] Bucket policy applied (private). Initialization complete."
