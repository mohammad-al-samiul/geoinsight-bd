-- =============================================================================
-- GeoInsight BD — TimescaleDB + Performance Optimization Migration
-- DBA: Hypertables, composite indexes, hierarchy triggers, RBAC seed
-- =============================================================================

-- ── 1. Extensions (idempotent) ───────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ── 2. New enums ─────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE "KpiRecordStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'VERIFIED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "RbacAction" AS ENUM ('CREATE', 'READ', 'UPDATE', 'DELETE', 'APPROVE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── 3. Admin units — hierarchy denormalization columns ───────────────────────
ALTER TABLE "admin_units"
  ADD COLUMN IF NOT EXISTS "code" VARCHAR(16),
  ADD COLUMN IF NOT EXISTS "division_id" UUID,
  ADD COLUMN IF NOT EXISTS "district_id" UUID,
  ADD COLUMN IF NOT EXISTS "upazila_id" UUID;

-- Backfill code from id prefix where missing (dev environments)
UPDATE "admin_units"
SET "code" = LEFT(REPLACE(id::text, '-', ''), 8)
WHERE "code" IS NULL;

ALTER TABLE "admin_units" ALTER COLUMN "code" SET NOT NULL;

DROP INDEX IF EXISTS "admin_units_type_code_key";
CREATE UNIQUE INDEX IF NOT EXISTS "admin_units_type_code_key" ON "admin_units" ("type", "code");

CREATE INDEX IF NOT EXISTS "admin_units_parent_id_type_idx"
  ON "admin_units" ("parent_id", "type");
CREATE INDEX IF NOT EXISTS "admin_units_division_district_upazila_idx"
  ON "admin_units" ("division_id", "district_id", "upazila_id");
CREATE INDEX IF NOT EXISTS "admin_units_division_id_idx" ON "admin_units" ("division_id");
CREATE INDEX IF NOT EXISTS "admin_units_district_id_idx" ON "admin_units" ("district_id");
CREATE INDEX IF NOT EXISTS "admin_units_upazila_id_idx" ON "admin_units" ("upazila_id");

-- ── 4. Trigger: maintain denormalized ancestor IDs on admin_units ─────────────
CREATE OR REPLACE FUNCTION geoinsight_sync_admin_unit_ancestors()
RETURNS TRIGGER AS $$
DECLARE
  div_id UUID;
  dist_id UUID;
  upa_id UUID;
BEGIN
  WITH RECURSIVE ancestors AS (
    SELECT id, "type", "parent_id" FROM "admin_units" WHERE id = NEW.id
    UNION ALL
    SELECT p.id, p."type", p."parent_id"
    FROM "admin_units" p
    INNER JOIN ancestors a ON p.id = a."parent_id"
  )
  SELECT
    (SELECT a.id FROM ancestors a WHERE a."type" = 'DIVISION' LIMIT 1),
    (SELECT a.id FROM ancestors a WHERE a."type" = 'DISTRICT' LIMIT 1),
    (SELECT a.id FROM ancestors a WHERE a."type" = 'UPAZILA' LIMIT 1)
  INTO div_id, dist_id, upa_id;

  IF NEW."type" = 'DIVISION' THEN div_id := NEW.id; END IF;
  IF NEW."type" = 'DISTRICT' THEN dist_id := NEW.id; END IF;
  IF NEW."type" = 'UPAZILA' THEN upa_id := NEW.id; END IF;

  NEW."division_id" := div_id;
  NEW."district_id" := dist_id;
  NEW."upazila_id"  := upa_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_admin_unit_ancestors ON "admin_units";
CREATE TRIGGER trg_admin_unit_ancestors
  BEFORE INSERT OR UPDATE OF "parent_id", "type" ON "admin_units"
  FOR EACH ROW EXECUTE FUNCTION geoinsight_sync_admin_unit_ancestors();

-- ── 5. Role permissions (multi-tenant RBAC matrix) ───────────────────────────
CREATE TABLE IF NOT EXISTS "role_permissions" (
  "id"            UUID NOT NULL DEFAULT gen_random_uuid(),
  "role"          "UserRole" NOT NULL,
  "resource"      VARCHAR(64) NOT NULL,
  "action"        "RbacAction" NOT NULL,
  "min_unit_type" "AdminUnitType",
  "description"   VARCHAR(255),
  CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "role_permissions_role_resource_action_key"
  ON "role_permissions" ("role", "resource", "action");
CREATE INDEX IF NOT EXISTS "role_permissions_role_resource_idx"
  ON "role_permissions" ("role", "resource");

-- Seed default RBAC matrix (idempotent)
INSERT INTO "role_permissions" ("role", "resource", "action", "min_unit_type", "description")
VALUES
  ('PMO',            'kpi',      'CREATE', NULL,     'National KPI write'),
  ('PMO',            'kpi',      'READ',   NULL,     'National KPI read'),
  ('PMO',            'project',  'APPROVE', NULL,    'National project approval'),
  ('MINISTER',       'kpi',      'READ',   'DIVISION', 'Division-scoped KPI read'),
  ('DC',             'kpi',      'CREATE', 'DISTRICT', 'District KPI write'),
  ('DC',             'project',  'READ',   'DISTRICT', 'District project read'),
  ('UNION_CHAIRMAN', 'kpi',      'CREATE', 'UNION',    'Union KPI write')
ON CONFLICT DO NOTHING;

-- ── 6. KPI records — add status column ───────────────────────────────────────
ALTER TABLE "kpi_records"
  ADD COLUMN IF NOT EXISTS "status" "KpiRecordStatus" NOT NULL DEFAULT 'SUBMITTED';

-- ── 7. Commodity price logs (TimescaleDB hypertable) ─────────────────────────
CREATE TABLE IF NOT EXISTS "commodity_price_logs" (
  "id"                UUID NOT NULL DEFAULT gen_random_uuid(),
  "commodity_code"    VARCHAR(50) NOT NULL,
  "country_code"      CHAR(3) NOT NULL,
  "country_name"      VARCHAR(120) NOT NULL,
  "unit_price_usd"    DECIMAL(18,4) NOT NULL,
  "shipping_cost_usd" DECIMAL(18,2),
  "tariff_rate"       DECIMAL(8,4),
  "landed_cost_usd"   DECIMAL(18,2),
  "source_rank"       INTEGER,
  "metadata"          JSONB,
  "admin_unit_id"     UUID,
  "division_id"       UUID,
  "district_id"       UUID,
  "upazila_id"        UUID,
  "representative_id" UUID,
  "created_at"        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "commodity_price_logs_pkey" PRIMARY KEY ("id", "created_at")
);

-- Foreign keys (soft — nullable context columns)
ALTER TABLE "commodity_price_logs" DROP CONSTRAINT IF EXISTS "commodity_price_logs_admin_unit_id_fkey";
ALTER TABLE "commodity_price_logs"
  ADD CONSTRAINT "commodity_price_logs_admin_unit_id_fkey"
  FOREIGN KEY ("admin_unit_id") REFERENCES "admin_units"("id") ON DELETE SET NULL;

ALTER TABLE "commodity_price_logs" DROP CONSTRAINT IF EXISTS "commodity_price_logs_representative_id_fkey";
ALTER TABLE "commodity_price_logs"
  ADD CONSTRAINT "commodity_price_logs_representative_id_fkey"
  FOREIGN KEY ("representative_id") REFERENCES "representatives"("id") ON DELETE SET NULL;

-- Convert to hypertable (7-day chunks for high-volume global trade ingest)
DO $$
BEGIN
  PERFORM create_hypertable(
    'commodity_price_logs',
    'created_at',
    chunk_time_interval => INTERVAL '7 days',
    if_not_exists       => TRUE,
    migrate_data        => TRUE
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Hypertable already exists or TimescaleDB unavailable: %', SQLERRM;
END $$;

-- Compression + retention (production tuning)
ALTER TABLE "commodity_price_logs" SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = 'commodity_code, country_code',
  timescaledb.compress_orderby   = 'created_at DESC'
);

SELECT add_compression_policy('commodity_price_logs', INTERVAL '30 days', if_not_exists => TRUE);
SELECT add_retention_policy('commodity_price_logs', INTERVAL '730 days', if_not_exists => TRUE);

-- ── 8. Composite performance indexes ─────────────────────────────────────────

-- KPI records
DROP INDEX IF EXISTS "kpi_records_representative_id_kpi_def_id_recorded_at_idx";
CREATE INDEX IF NOT EXISTS "kpi_records_rep_status_recorded_idx"
  ON "kpi_records" ("representative_id", "status", "recorded_at" DESC);
CREATE INDEX IF NOT EXISTS "kpi_records_rep_def_fiscal_idx"
  ON "kpi_records" ("representative_id", "kpi_def_id", "fiscal_year");
CREATE INDEX IF NOT EXISTS "kpi_records_def_fiscal_status_idx"
  ON "kpi_records" ("kpi_def_id", "fiscal_year", "status");

-- Users (tenant RBAC lookups)
DROP INDEX IF EXISTS "users_admin_unit_id_idx";
DROP INDEX IF EXISTS "users_role_idx";
CREATE INDEX IF NOT EXISTS "users_unit_role_active_idx"
  ON "users" ("admin_unit_id", "role", "is_active");
CREATE INDEX IF NOT EXISTS "users_role_active_idx"
  ON "users" ("role", "is_active");

-- Representatives
CREATE INDEX IF NOT EXISTS "representatives_unit_role_idx"
  ON "representatives" ("admin_unit_id", "role");
CREATE INDEX IF NOT EXISTS "representatives_unit_tenure_idx"
  ON "representatives" ("admin_unit_id", "tenure_end");

-- Projects
CREATE INDEX IF NOT EXISTS "projects_unit_status_idx"
  ON "projects" ("admin_unit_id", "status");
CREATE INDEX IF NOT EXISTS "projects_status_unit_idx"
  ON "projects" ("status", "admin_unit_id");
CREATE INDEX IF NOT EXISTS "projects_status_start_idx"
  ON "projects" ("status", "start_date" DESC);

-- Commodity price logs (time-series hot paths)
CREATE INDEX IF NOT EXISTS "commodity_logs_commodity_country_time_idx"
  ON "commodity_price_logs" ("commodity_code", "country_code", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "commodity_logs_rep_time_idx"
  ON "commodity_price_logs" ("representative_id", "created_at" DESC)
  WHERE "representative_id" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "commodity_logs_division_district_time_idx"
  ON "commodity_price_logs" ("division_id", "district_id", "created_at" DESC)
  WHERE "division_id" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "commodity_logs_district_upazila_time_idx"
  ON "commodity_price_logs" ("district_id", "upazila_id", "created_at" DESC)
  WHERE "district_id" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "commodity_logs_unit_time_idx"
  ON "commodity_price_logs" ("admin_unit_id", "created_at" DESC)
  WHERE "admin_unit_id" IS NOT NULL;

-- Blockchain queue
CREATE INDEX IF NOT EXISTS "blockchain_queue_rep_status_idx"
  ON "blockchain_milestone_queue" ("representative_id", "status");

-- Red flags — open alerts partial index
CREATE INDEX IF NOT EXISTS "red_flag_alerts_open_idx"
  ON "red_flag_alerts" ("project_id", "severity" DESC)
  WHERE "resolved_at" IS NULL;

-- Agro markets
CREATE INDEX IF NOT EXISTS "agro_markets_unit_type_idx"
  ON "agro_markets" ("admin_unit_id", "type");

-- ── 9. Analyze for query planner ─────────────────────────────────────────────
ANALYZE "admin_units";
ANALYZE "users";
ANALYZE "representatives";
ANALYZE "kpi_records";
ANALYZE "projects";
ANALYZE "commodity_price_logs";
