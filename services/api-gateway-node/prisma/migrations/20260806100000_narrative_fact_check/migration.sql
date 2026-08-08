-- Narrative Shield: automatic fact-checker fields

DO $$ BEGIN
  CREATE TYPE "NarrativeFactCheckStatus" AS ENUM (
    'AUTHENTIC',
    'NEEDS_REVIEW',
    'LIKELY_DISINFO',
    'UNVERIFIED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "narrative_signals"
  ADD COLUMN IF NOT EXISTS "fact_check_status" "NarrativeFactCheckStatus" NOT NULL DEFAULT 'UNVERIFIED',
  ADD COLUMN IF NOT EXISTS "authenticity_score" DECIMAL(5,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "google_verify_url" VARCHAR(2048),
  ADD COLUMN IF NOT EXISTS "fact_check_summary" TEXT,
  ADD COLUMN IF NOT EXISTS "evidence_urls" JSONB,
  ADD COLUMN IF NOT EXISTS "fact_checked_at" TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS "narrative_signals_fact_check_status_idx"
  ON "narrative_signals" ("fact_check_status", "status");
