-- P1: alert delivery retry fields + local service outage board
ALTER TABLE "alert_delivery_logs"
  ADD COLUMN IF NOT EXISTS "retry_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "next_retry_at" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "last_attempt_at" TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS "alert_delivery_logs_status_next_retry_at_idx"
  ON "alert_delivery_logs"("status", "next_retry_at");

DO $$ BEGIN
  CREATE TYPE "ServiceOutageKind" AS ENUM ('POWER', 'WATER', 'DRAINAGE', 'ROAD', 'INTERNET', 'OTHER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ServiceOutageStatus" AS ENUM ('ACTIVE', 'WATCH', 'RESOLVED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "local_service_outages" (
  "id" UUID NOT NULL,
  "kind" "ServiceOutageKind" NOT NULL DEFAULT 'OTHER',
  "status" "ServiceOutageStatus" NOT NULL DEFAULT 'ACTIVE',
  "title" VARCHAR(255) NOT NULL,
  "title_bn" VARCHAR(255),
  "detail" TEXT,
  "detail_bn" TEXT,
  "severity" INTEGER NOT NULL DEFAULT 3,
  "affected_count" INTEGER NOT NULL DEFAULT 0,
  "lat" DOUBLE PRECISION,
  "lng" DOUBLE PRECISION,
  "started_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolved_at" TIMESTAMPTZ,
  "eta_restore_at" TIMESTAMPTZ,
  "ward_id" UUID,
  "entity_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "local_service_outages_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "local_service_outages_entity_id_status_started_at_idx"
  ON "local_service_outages"("entity_id", "status", "started_at" DESC);

CREATE INDEX IF NOT EXISTS "local_service_outages_entity_id_kind_status_idx"
  ON "local_service_outages"("entity_id", "kind", "status");

CREATE INDEX IF NOT EXISTS "local_service_outages_ward_id_status_idx"
  ON "local_service_outages"("ward_id", "status");

DO $$ BEGIN
  ALTER TABLE "local_service_outages"
    ADD CONSTRAINT "local_service_outages_ward_id_fkey"
    FOREIGN KEY ("ward_id") REFERENCES "admin_units"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "local_service_outages"
    ADD CONSTRAINT "local_service_outages_entity_id_fkey"
    FOREIGN KEY ("entity_id") REFERENCES "admin_units"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
