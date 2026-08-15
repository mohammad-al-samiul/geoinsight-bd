-- Phase 2: curated thesis / expert / policy-brief evidence engine

DO $$ BEGIN
  CREATE TYPE "EvidenceKind" AS ENUM ('THESIS', 'EXPERT', 'POLICY_BRIEF');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "EvidenceGeoScope" AS ENUM ('NATIONAL', 'DISTRICT', 'ENTITY');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "local_evidence_items" (
  "id" UUID NOT NULL,
  "kind" "EvidenceKind" NOT NULL,
  "topics" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "title" VARCHAR(400) NOT NULL,
  "title_bn" VARCHAR(400),
  "abstract" TEXT NOT NULL,
  "abstract_bn" TEXT,
  "author" VARCHAR(255),
  "institution" VARCHAR(255),
  "source_name" VARCHAR(128) NOT NULL,
  "url" VARCHAR(2048) NOT NULL,
  "year" INTEGER NOT NULL,
  "published_at" TIMESTAMPTZ,
  "strength" INTEGER NOT NULL DEFAULT 3,
  "geo_scope" "EvidenceGeoScope" NOT NULL DEFAULT 'NATIONAL',
  "district" VARCHAR(64),
  "division" VARCHAR(64),
  "solutions" JSONB NOT NULL,
  "entity_id" UUID,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "local_evidence_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "local_evidence_items_url_key"
  ON "local_evidence_items"("url");

CREATE INDEX IF NOT EXISTS "local_evidence_items_kind_year_idx"
  ON "local_evidence_items"("kind", "year" DESC);

CREATE INDEX IF NOT EXISTS "local_evidence_items_geo_scope_district_idx"
  ON "local_evidence_items"("geo_scope", "district");

CREATE INDEX IF NOT EXISTS "local_evidence_items_entity_id_year_idx"
  ON "local_evidence_items"("entity_id", "year" DESC);

CREATE INDEX IF NOT EXISTS "local_evidence_items_topics_gin_idx"
  ON "local_evidence_items" USING GIN ("topics");

DO $$ BEGIN
  ALTER TABLE "local_evidence_items"
    ADD CONSTRAINT "local_evidence_items_entity_id_fkey"
    FOREIGN KEY ("entity_id") REFERENCES "admin_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
