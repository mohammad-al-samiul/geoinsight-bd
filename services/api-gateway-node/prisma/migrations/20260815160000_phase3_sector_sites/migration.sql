-- Phase 3: education / health / employment sites on the mayor-MP desk

DO $$ BEGIN
  CREATE TYPE "LocalSector" AS ENUM ('EDUCATION', 'HEALTH', 'EMPLOYMENT');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "LocalSiteKind" AS ENUM (
    'PRIMARY_SCHOOL', 'SECONDARY_SCHOOL', 'COLLEGE',
    'HOSPITAL', 'CLINIC', 'PHARMACY',
    'TRAINING_CENTER', 'JOB_FAIR', 'EPZ_GATE'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "LocalSiteStatus" AS ENUM ('OK', 'WATCH', 'ALERT');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "local_sector_sites" (
  "id" UUID NOT NULL,
  "sector" "LocalSector" NOT NULL,
  "kind" "LocalSiteKind" NOT NULL,
  "status" "LocalSiteStatus" NOT NULL DEFAULT 'WATCH',
  "source" "SignalSource" NOT NULL DEFAULT 'OFFICIAL',
  "title" VARCHAR(255) NOT NULL,
  "title_bn" VARCHAR(255),
  "detail" TEXT,
  "detail_bn" TEXT,
  "metrics" JSONB NOT NULL,
  "severity" INTEGER NOT NULL DEFAULT 3,
  "lat" DOUBLE PRECISION,
  "lng" DOUBLE PRECISION,
  "observed_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "ward_id" UUID,
  "entity_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "local_sector_sites_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "local_sector_sites_entity_sector_status_idx"
  ON "local_sector_sites"("entity_id", "sector", "status");

CREATE INDEX IF NOT EXISTS "local_sector_sites_entity_sector_observed_idx"
  ON "local_sector_sites"("entity_id", "sector", "observed_at" DESC);

CREATE INDEX IF NOT EXISTS "local_sector_sites_ward_sector_idx"
  ON "local_sector_sites"("ward_id", "sector");

DO $$ BEGIN
  ALTER TABLE "local_sector_sites"
    ADD CONSTRAINT "local_sector_sites_ward_id_fkey"
    FOREIGN KEY ("ward_id") REFERENCES "admin_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "local_sector_sites"
    ADD CONSTRAINT "local_sector_sites_entity_id_fkey"
    FOREIGN KEY ("entity_id") REFERENCES "admin_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
