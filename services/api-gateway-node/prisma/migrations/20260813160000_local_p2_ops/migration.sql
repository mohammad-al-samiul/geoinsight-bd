-- P2 Local DSS ops: visit planner + pulse event calendar

CREATE TYPE "LocalVisitStatus" AS ENUM ('PLANNED', 'DONE', 'CANCELLED');
CREATE TYPE "LocalVisitReason" AS ENUM ('WPI_DROP', 'RED_ALERT', 'OUTAGE', 'SPECIALTY', 'MANUAL');
CREATE TYPE "LocalPulseEventKind" AS ENUM ('MEETING', 'RALLY', 'OUTREACH', 'FOLLOW_UP', 'OTHER');

CREATE TABLE "local_visit_plans" (
    "id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "title_bn" VARCHAR(255),
    "reason" "LocalVisitReason" NOT NULL DEFAULT 'MANUAL',
    "status" "LocalVisitStatus" NOT NULL DEFAULT 'PLANNED',
    "scheduled_at" TIMESTAMPTZ NOT NULL,
    "notes" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 50,
    "ward_id" UUID,
    "entity_id" UUID NOT NULL,
    "created_by_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "local_visit_plans_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "local_pulse_events" (
    "id" UUID NOT NULL,
    "kind" "LocalPulseEventKind" NOT NULL DEFAULT 'OTHER',
    "title" VARCHAR(255) NOT NULL,
    "title_bn" VARCHAR(255),
    "detail" TEXT,
    "starts_at" TIMESTAMPTZ NOT NULL,
    "ends_at" TIMESTAMPTZ,
    "location_label" VARCHAR(255),
    "done" BOOLEAN NOT NULL DEFAULT false,
    "influencer_id" UUID,
    "ward_id" UUID,
    "entity_id" UUID NOT NULL,
    "created_by_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "local_pulse_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "local_visit_plans_entity_id_status_scheduled_at_idx" ON "local_visit_plans"("entity_id", "status", "scheduled_at");
CREATE INDEX "local_visit_plans_ward_id_status_idx" ON "local_visit_plans"("ward_id", "status");
CREATE INDEX "local_pulse_events_entity_id_starts_at_idx" ON "local_pulse_events"("entity_id", "starts_at");
CREATE INDEX "local_pulse_events_influencer_id_starts_at_idx" ON "local_pulse_events"("influencer_id", "starts_at");
CREATE INDEX "local_pulse_events_ward_id_starts_at_idx" ON "local_pulse_events"("ward_id", "starts_at");

ALTER TABLE "local_visit_plans" ADD CONSTRAINT "local_visit_plans_ward_id_fkey" FOREIGN KEY ("ward_id") REFERENCES "admin_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "local_visit_plans" ADD CONSTRAINT "local_visit_plans_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "admin_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "local_visit_plans" ADD CONSTRAINT "local_visit_plans_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "local_pulse_events" ADD CONSTRAINT "local_pulse_events_influencer_id_fkey" FOREIGN KEY ("influencer_id") REFERENCES "local_influencers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "local_pulse_events" ADD CONSTRAINT "local_pulse_events_ward_id_fkey" FOREIGN KEY ("ward_id") REFERENCES "admin_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "local_pulse_events" ADD CONSTRAINT "local_pulse_events_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "admin_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "local_pulse_events" ADD CONSTRAINT "local_pulse_events_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
