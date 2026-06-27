#!/bin/bash
# GeoInsight BD — PostgreSQL read-replica bootstrap (streaming standby)
set -euo pipefail

PGDATA="${PGDATA:-/var/lib/postgresql/data/pgdata}"
PRIMARY_HOST="${POSTGRES_PRIMARY_HOST:-postgres}"
REPL_USER="${POSTGRES_REPLICATION_USER:-replicator}"
REPL_PASS="${POSTGRES_REPLICATION_PASSWORD:-change_me_replication_password}"

if [ ! -f "$PGDATA/PG_VERSION" ]; then
  echo "[replica] Waiting for primary at ${PRIMARY_HOST}..."
  until pg_isready -h "$PRIMARY_HOST" -p 5432 -U "$POSTGRES_USER" -d "$POSTGRES_DB"; do
    sleep 2
  done

  echo "[replica] Running pg_basebackup from ${PRIMARY_HOST}..."
  export PGPASSWORD="$REPL_PASS"
  pg_basebackup \
    -h "$PRIMARY_HOST" \
    -D "$PGDATA" \
    -U "$REPL_USER" \
    -Fp -Xs -P -R

  chown -R postgres:postgres "$PGDATA"
  echo "[replica] Standby data directory ready"
fi

exec docker-entrypoint.sh postgres \
  -c hot_standby=on \
  -c max_connections=300
