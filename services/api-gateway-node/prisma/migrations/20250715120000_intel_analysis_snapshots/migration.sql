-- Persist PM briefing / unrest analysis snapshots
CREATE TYPE "IntelSnapshotKind" AS ENUM ('BRIEFING', 'UNREST');

CREATE TABLE IF NOT EXISTS "intel_analysis_snapshots" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "kind" "IntelSnapshotKind" NOT NULL,
  "lang" VARCHAR(8) NOT NULL DEFAULT 'bn',
  "scope_key" VARCHAR(64),
  "payload" JSONB NOT NULL,
  "source_count" INTEGER NOT NULL DEFAULT 0,
  "llm_used" BOOLEAN NOT NULL DEFAULT false,
  "generated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "intel_analysis_snapshots_kind_lang_generated_idx"
  ON "intel_analysis_snapshots" ("kind", "lang", "generated_at" DESC);

CREATE INDEX IF NOT EXISTS "intel_analysis_snapshots_kind_scope_generated_idx"
  ON "intel_analysis_snapshots" ("kind", "scope_key", "generated_at" DESC);
