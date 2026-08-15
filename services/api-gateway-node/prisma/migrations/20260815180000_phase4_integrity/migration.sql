-- Phase 4: crime / corruption incidents on the mayor-MP desk

DO $$ BEGIN
  CREATE TYPE "LocalIntegrityDomain" AS ENUM ('CRIME', 'CORRUPTION');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "LocalIntegrityKind" AS ENUM (
    'THEFT', 'SNATCH', 'MURDER', 'STREET_VIOLENCE', 'EVE_TEASING',
    'NARCOTICS', 'CYBER', 'TRAFFIC_ACCIDENT', 'FIRE',
    'BRIBE', 'HOLDING_TAX', 'TENDER', 'PROJECT_GHOST', 'LICENSE_DESK', 'RECRUITMENT'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "LocalIntegrityStatus" AS ENUM ('OPEN', 'WATCH', 'CLOSED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "local_integrity_incidents" (
  "id" UUID NOT NULL,
  "domain" "LocalIntegrityDomain" NOT NULL,
  "kind" "LocalIntegrityKind" NOT NULL,
  "status" "LocalIntegrityStatus" NOT NULL DEFAULT 'OPEN',
  "source" "SignalSource" NOT NULL DEFAULT 'OFFICIAL',
  "title" VARCHAR(255) NOT NULL,
  "title_bn" VARCHAR(255),
  "detail" TEXT,
  "detail_bn" TEXT,
  "metrics" JSONB NOT NULL,
  "severity" INTEGER NOT NULL DEFAULT 3,
  "lat" DOUBLE PRECISION,
  "lng" DOUBLE PRECISION,
  "occurred_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "ward_id" UUID,
  "entity_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "local_integrity_incidents_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "local_integrity_incidents_entity_domain_status_idx"
  ON "local_integrity_incidents"("entity_id", "domain", "status");

CREATE INDEX IF NOT EXISTS "local_integrity_incidents_entity_domain_occurred_idx"
  ON "local_integrity_incidents"("entity_id", "domain", "occurred_at" DESC);

CREATE INDEX IF NOT EXISTS "local_integrity_incidents_ward_domain_idx"
  ON "local_integrity_incidents"("ward_id", "domain");

DO $$ BEGIN
  ALTER TABLE "local_integrity_incidents"
    ADD CONSTRAINT "local_integrity_incidents_ward_id_fkey"
    FOREIGN KEY ("ward_id") REFERENCES "admin_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "local_integrity_incidents"
    ADD CONSTRAINT "local_integrity_incidents_entity_id_fkey"
    FOREIGN KEY ("entity_id") REFERENCES "admin_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
