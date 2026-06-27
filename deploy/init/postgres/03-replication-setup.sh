#!/bin/bash
# Primary node — replication role + pg_hba (runs once on first cluster init)
set -euo pipefail

REPL_PASS="${POSTGRES_REPLICATION_PASSWORD:-change_me_replication_password}"

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
  DO \$\$
  BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'replicator') THEN
      CREATE ROLE replicator WITH REPLICATION LOGIN PASSWORD '${REPL_PASS}';
    END IF;
  END
  \$\$;
EOSQL

# Allow streaming replication from Docker network
if ! grep -q "host replication replicator" "$PGDATA/pg_hba.conf"; then
  echo "host replication replicator 0.0.0.0/0 scram-sha-256" >> "$PGDATA/pg_hba.conf"
fi

echo "[postgres-init] Replication user 'replicator' configured"
