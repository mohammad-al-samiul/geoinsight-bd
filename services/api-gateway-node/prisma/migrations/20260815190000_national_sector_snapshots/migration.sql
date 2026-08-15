-- PMO national education / health / employment snapshots (district grain)

CREATE TABLE IF NOT EXISTS "national_sector_snapshots" (
  "id" UUID NOT NULL,
  "sector" "LocalSector" NOT NULL,
  "status" "LocalSiteStatus" NOT NULL DEFAULT 'WATCH',
  "source" "SignalSource" NOT NULL DEFAULT 'OFFICIAL',
  "metrics" JSONB NOT NULL,
  "severity" INTEGER NOT NULL DEFAULT 3,
  "observed_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "admin_unit_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "national_sector_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "national_sector_snapshots_unit_sector_key"
  ON "national_sector_snapshots"("admin_unit_id", "sector");

CREATE INDEX IF NOT EXISTS "national_sector_snapshots_sector_status_idx"
  ON "national_sector_snapshots"("sector", "status");

CREATE INDEX IF NOT EXISTS "national_sector_snapshots_unit_sector_idx"
  ON "national_sector_snapshots"("admin_unit_id", "sector");

DO $$ BEGIN
  ALTER TABLE "national_sector_snapshots"
    ADD CONSTRAINT "national_sector_snapshots_admin_unit_id_fkey"
    FOREIGN KEY ("admin_unit_id") REFERENCES "admin_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
