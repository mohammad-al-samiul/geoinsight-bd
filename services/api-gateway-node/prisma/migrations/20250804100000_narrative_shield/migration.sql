-- Narrative Shield: counter-disinformation signals + immutable audit ledger

DO $$ BEGIN
  CREATE TYPE "NarrativeThreatLevel" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "NarrativeCategory" AS ENUM (
    'ANTI_GOVT_INCITEMENT',
    'SOVEREIGNTY_THREAT',
    'ECONOMIC_DISINFO',
    'SOCIAL_UNREST',
    'RELIGIOUS_EXTREMISM',
    'ELECTORAL_MANIPULATION'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "NarrativeSignalStatus" AS ENUM ('ACTIVE', 'DEBUNKED', 'ESCALATED', 'DISMISSED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "narrative_signals" (
  "id"                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "fingerprint"       VARCHAR(64) UNIQUE NOT NULL,
  "title"             TEXT NOT NULL,
  "title_bn"          TEXT,
  "body"              TEXT,
  "source_url"        VARCHAR(2048),
  "source_name"       VARCHAR(128) NOT NULL,
  "source_platform"   VARCHAR(64) NOT NULL,
  "speaker_name"      VARCHAR(255),
  "organization"      VARCHAR(255),
  "district"          VARCHAR(64),
  "division"          VARCHAR(64),
  "threat_level"      "NarrativeThreatLevel" NOT NULL,
  "category"          "NarrativeCategory" NOT NULL,
  "status"            "NarrativeSignalStatus" NOT NULL DEFAULT 'ACTIVE',
  "confidence_score"  DECIMAL(5,4) NOT NULL DEFAULT 0,
  "rag_debunk"        TEXT,
  "rag_confidence"    DECIMAL(5,4),
  "rag_policy_ref"    VARCHAR(512),
  "rag_source_ref"    VARCHAR(512),
  "escalated_at"      TIMESTAMPTZ,
  "debunked_at"       TIMESTAMPTZ,
  "dismissed_at"      TIMESTAMPTZ,
  "action_by_user_id" UUID,
  "action_audit_hash" VARCHAR(64),
  "published_at"      TIMESTAMPTZ,
  "fetched_at"        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "created_at"        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "narrative_signals_status_threat_fetched_idx"
  ON "narrative_signals" ("status", "threat_level", "fetched_at" DESC);
CREATE INDEX IF NOT EXISTS "narrative_signals_category_status_idx"
  ON "narrative_signals" ("category", "status");
CREATE INDEX IF NOT EXISTS "narrative_signals_district_threat_idx"
  ON "narrative_signals" ("district", "threat_level");
CREATE INDEX IF NOT EXISTS "narrative_signals_org_status_idx"
  ON "narrative_signals" ("organization", "status");
CREATE INDEX IF NOT EXISTS "narrative_signals_fetched_idx"
  ON "narrative_signals" ("fetched_at" DESC);

CREATE TABLE IF NOT EXISTS "narrative_audit_logs" (
  "id"            BIGSERIAL PRIMARY KEY,
  "signal_id"     UUID NOT NULL,
  "action"        VARCHAR(32) NOT NULL,
  "operator_role" VARCHAR(32),
  "ip_address"    VARCHAR(45),
  "payload_hash"  VARCHAR(64) NOT NULL,
  "created_at"    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "narrative_audit_signal_idx"
  ON "narrative_audit_logs" ("signal_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "narrative_audit_action_idx"
  ON "narrative_audit_logs" ("action", "created_at" DESC);
