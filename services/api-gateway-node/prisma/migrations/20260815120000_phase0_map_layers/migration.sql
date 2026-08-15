-- Phase 0: gas/fuel outages, expanded complaint categories, signal source badges

ALTER TYPE "ServiceOutageKind" ADD VALUE IF NOT EXISTS 'GAS';
ALTER TYPE "ServiceOutageKind" ADD VALUE IF NOT EXISTS 'FUEL';

ALTER TYPE "ComplaintCategory" ADD VALUE IF NOT EXISTS 'UTILITIES';
ALTER TYPE "ComplaintCategory" ADD VALUE IF NOT EXISTS 'CRIME';
ALTER TYPE "ComplaintCategory" ADD VALUE IF NOT EXISTS 'CORRUPTION';
ALTER TYPE "ComplaintCategory" ADD VALUE IF NOT EXISTS 'EDUCATION';
ALTER TYPE "ComplaintCategory" ADD VALUE IF NOT EXISTS 'HEALTH';
ALTER TYPE "ComplaintCategory" ADD VALUE IF NOT EXISTS 'UNEMPLOYMENT';

DO $$ BEGIN
  CREATE TYPE "SignalSource" AS ENUM ('OFFICIAL', 'CITIZEN', 'NEWS', 'ACADEMIC');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "local_service_outages"
  ADD COLUMN IF NOT EXISTS "source" "SignalSource" NOT NULL DEFAULT 'OFFICIAL';

ALTER TABLE "citizen_complaints"
  ADD COLUMN IF NOT EXISTS "source" "SignalSource" NOT NULL DEFAULT 'CITIZEN';

CREATE INDEX IF NOT EXISTS "local_service_outages_entity_id_source_idx"
  ON "local_service_outages"("entity_id", "source");

CREATE INDEX IF NOT EXISTS "citizen_complaints_entity_id_source_idx"
  ON "citizen_complaints"("entity_id", "source");
