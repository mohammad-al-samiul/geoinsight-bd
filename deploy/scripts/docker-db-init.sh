#!/bin/bash
# One-shot DB bootstrap for Docker Compose (idempotent)
# Requires: Prisma migrations already applied (db-migrate service)
set -euo pipefail

export PGHOST="${PGHOST:-postgres}"
export PGPORT="${PGPORT:-5432}"
export PGUSER="${PGUSER:-geoinsight_admin}"
export PGDATABASE="${PGDATABASE:-geoinsight_db}"
export PGPASSWORD="${POSTGRES_PASSWORD:?POSTGRES_PASSWORD required}"

echo "[db-init] Waiting for PostgreSQL at ${PGHOST}:${PGPORT}..."
until pg_isready -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE"; do
  sleep 2
done

echo "[db-init] Waiting for schema (admin_units) from Prisma migrate..."
for i in $(seq 1 60); do
  if psql -tAc "SELECT 1 FROM information_schema.tables WHERE table_name='admin_units'" | grep -q 1; then
    echo "[db-init] Schema ready."
    break
  fi
  if [ "$i" -eq 60 ]; then
    echo "[db-init] ERROR: admin_units missing — run db-migrate (prisma migrate deploy) first."
    exit 1
  fi
  sleep 2
done

echo "[db-init] Applying admin trigger fix..."
psql -v ON_ERROR_STOP=1 -f /scripts/fix-admin-trigger.sql

echo "[db-init] Seeding core national reference (divisions + KPI defs)..."
psql -v ON_ERROR_STOP=1 -c "SET client_encoding TO 'UTF8';" -f /scripts/seed-national-data.sql

echo "[db-init] Seeding extended real-world datasets..."
for seed in /scripts/seed/[0-9][0-9]-*.sql; do
  if [ -f "$seed" ]; then
    echo "[db-init]   -> $(basename "$seed")"
    psql -v ON_ERROR_STOP=1 -c "SET client_encoding TO 'UTF8';" -f "$seed"
  fi
done

echo "[db-init] Repairing Bengali admin unit labels..."
psql -v ON_ERROR_STOP=1 -c "SET client_encoding TO 'UTF8';" -f /scripts/fix-admin-unit-bn.sql

PMO_EXISTS="$(psql -tAc "SELECT 1 FROM users WHERE email='pmo@geoinsight.gov.bd'" 2>/dev/null || true)"
if [ "${PMO_EXISTS}" = "1" ]; then
  echo "[db-init] PMO user exists — updating password hash..."
  psql -v ON_ERROR_STOP=1 -f /scripts/bootstrap-pmo.sql
else
  echo "[db-init] Creating PMO bootstrap user..."
  psql -v ON_ERROR_STOP=1 <<'EOSQL'
INSERT INTO users (id, email, password_hash, role, is_active, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'pmo@geoinsight.gov.bd',
  '$2b$12$VshTVUC3IBQ8rdl7JioofOGEezxO5yV9bYJGeEr0R1qYYql9ujVnW',
  'PMO',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role,
  is_active = true,
  updated_at = NOW();
EOSQL
fi

echo "[db-init] Done."
