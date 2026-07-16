-- Pipeline job audit + ingestion sync audit (best-practice observability)

CREATE TABLE IF NOT EXISTS "pipeline_job_runs" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "job" VARCHAR(32) NOT NULL,
  "ok" BOOLEAN NOT NULL,
  "detail" JSONB,
  "duration_ms" INTEGER,
  "started_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "completed_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "pipeline_job_runs_job_completed_idx"
  ON "pipeline_job_runs" ("job", "completed_at" DESC);

CREATE INDEX IF NOT EXISTS "pipeline_job_runs_completed_idx"
  ON "pipeline_job_runs" ("completed_at" DESC);

CREATE TABLE IF NOT EXISTS "ingestion_sync_runs" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "fetched" INTEGER NOT NULL DEFAULT 0,
  "inserted" INTEGER NOT NULL DEFAULT 0,
  "updated" INTEGER NOT NULL DEFAULT 0,
  "feeds_ok" INTEGER NOT NULL DEFAULT 0,
  "feeds_total" INTEGER NOT NULL DEFAULT 0,
  "error" TEXT,
  "duration_ms" INTEGER,
  "completed_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "ingestion_sync_runs_completed_idx"
  ON "ingestion_sync_runs" ("completed_at" DESC);
