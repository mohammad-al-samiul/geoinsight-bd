-- =============================================================================
-- GeoInsight BD — PostgreSQL + TimescaleDB Production Tuning
-- Applied on container first boot (docker-entrypoint-initdb.d)
-- Adjust values per National Data Center hardware profile.
-- =============================================================================

-- Connection & memory (override via postgresql.conf in production)
-- shared_buffers          = 25% RAM
-- effective_cache_size    = 75% RAM
-- work_mem                = 64MB
-- maintenance_work_mem    = 512MB
-- random_page_cost        = 1.1   (SSD/NVMe)

-- TimescaleDB
-- timescaledb.max_background_workers = 8

-- GeoInsight schema search path + guardrails
DO $$
BEGIN
  EXECUTE format('ALTER DATABASE %I SET search_path TO public, geoinsight', current_database());
  EXECUTE format('ALTER DATABASE %I SET statement_timeout = %L', current_database(), '30s');
  EXECUTE format(
    'ALTER DATABASE %I SET idle_in_transaction_session_timeout = %L',
    current_database(),
    '60s'
  );
END $$;

-- Locale
SET timezone = 'Asia/Dhaka';

COMMENT ON EXTENSION timescaledb IS 'GeoInsight BD time-series: commodity_price_logs hypertable';
