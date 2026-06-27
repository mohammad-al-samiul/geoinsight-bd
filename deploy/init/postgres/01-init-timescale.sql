-- GeoInsight BD — PostgreSQL bootstrap (runs once on first container start)
-- Enables TimescaleDB for relational + time-series workloads.

CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Application schema namespace (Prisma / SQLAlchemy can target public or this schema)
CREATE SCHEMA IF NOT EXISTS geoinsight;

DO $$
BEGIN
  EXECUTE format(
    'COMMENT ON DATABASE %I IS %L',
    current_database(),
    'GeoInsight BD primary datastore (relational + hypertables)'
  );
END $$;
