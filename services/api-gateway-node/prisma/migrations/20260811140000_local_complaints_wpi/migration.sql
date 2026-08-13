-- P1 Local Entity DSS: Instant Action complaints + Ward Performance Index

CREATE TYPE "ComplaintSeverity" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW');
CREATE TYPE "ComplaintStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED');
CREATE TYPE "ComplaintCategory" AS ENUM (
  'INFRASTRUCTURE',
  'DRAINAGE',
  'WASTE',
  'SAFETY',
  'TRAFFIC',
  'HILL_CUTTING',
  'HERITAGE',
  'OTHER'
);

CREATE TABLE "citizen_complaints" (
    "id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "title_bn" VARCHAR(255),
    "description" TEXT,
    "category" "ComplaintCategory" NOT NULL DEFAULT 'OTHER',
    "severity" "ComplaintSeverity" NOT NULL DEFAULT 'MEDIUM',
    "status" "ComplaintStatus" NOT NULL DEFAULT 'OPEN',
    "citizen_name" VARCHAR(120),
    "citizen_phone" VARCHAR(20),
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "location_label" VARCHAR(255),
    "before_photo_url" TEXT,
    "after_photo_url" TEXT,
    "resolution_note" TEXT,
    "sla_deadline" TIMESTAMPTZ NOT NULL,
    "is_red_alert" BOOLEAN NOT NULL DEFAULT false,
    "resolved_at" TIMESTAMPTZ,
    "ward_id" UUID NOT NULL,
    "entity_id" UUID NOT NULL,
    "resolved_by_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "citizen_complaints_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ward_performance_scores" (
    "id" UUID NOT NULL,
    "period_key" VARCHAR(16) NOT NULL,
    "score" INTEGER NOT NULL,
    "service_score" INTEGER NOT NULL,
    "infra_score" INTEGER NOT NULL,
    "resolution_score" INTEGER NOT NULL,
    "open_complaints" INTEGER NOT NULL DEFAULT 0,
    "resolved_within_sla" INTEGER NOT NULL DEFAULT 0,
    "total_resolved" INTEGER NOT NULL DEFAULT 0,
    "computed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ward_id" UUID NOT NULL,
    "entity_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "ward_performance_scores_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "citizen_complaints_entity_id_status_created_at_idx"
  ON "citizen_complaints"("entity_id", "status", "created_at" DESC);
CREATE INDEX "citizen_complaints_ward_id_status_idx"
  ON "citizen_complaints"("ward_id", "status");
CREATE INDEX "citizen_complaints_is_red_alert_status_sla_deadline_idx"
  ON "citizen_complaints"("is_red_alert", "status", "sla_deadline");
CREATE INDEX "citizen_complaints_severity_status_idx"
  ON "citizen_complaints"("severity", "status");

CREATE UNIQUE INDEX "ward_performance_scores_ward_id_period_key_key"
  ON "ward_performance_scores"("ward_id", "period_key");
CREATE INDEX "ward_performance_scores_entity_id_period_key_score_idx"
  ON "ward_performance_scores"("entity_id", "period_key", "score" DESC);
CREATE INDEX "ward_performance_scores_score_idx"
  ON "ward_performance_scores"("score");

ALTER TABLE "citizen_complaints"
  ADD CONSTRAINT "citizen_complaints_ward_id_fkey"
  FOREIGN KEY ("ward_id") REFERENCES "admin_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "citizen_complaints"
  ADD CONSTRAINT "citizen_complaints_entity_id_fkey"
  FOREIGN KEY ("entity_id") REFERENCES "admin_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "citizen_complaints"
  ADD CONSTRAINT "citizen_complaints_resolved_by_id_fkey"
  FOREIGN KEY ("resolved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ward_performance_scores"
  ADD CONSTRAINT "ward_performance_scores_ward_id_fkey"
  FOREIGN KEY ("ward_id") REFERENCES "admin_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ward_performance_scores"
  ADD CONSTRAINT "ward_performance_scores_entity_id_fkey"
  FOREIGN KEY ("entity_id") REFERENCES "admin_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;
