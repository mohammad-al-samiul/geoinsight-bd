-- P0: complaint assignee + append-only workflow timeline
ALTER TABLE "citizen_complaints"
  ADD COLUMN IF NOT EXISTS "assignee_id" UUID;

DO $$ BEGIN
  CREATE TYPE "ComplaintEventKind" AS ENUM ('CREATED', 'ASSIGNED', 'STARTED', 'NOTE', 'RESOLVED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "complaint_status_events" (
  "id" UUID NOT NULL,
  "kind" "ComplaintEventKind" NOT NULL DEFAULT 'NOTE',
  "from_status" "ComplaintStatus",
  "to_status" "ComplaintStatus",
  "note" VARCHAR(512),
  "complaint_id" UUID NOT NULL,
  "actor_user_id" UUID,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "complaint_status_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "citizen_complaints_assignee_id_status_idx"
  ON "citizen_complaints"("assignee_id", "status");

CREATE INDEX IF NOT EXISTS "complaint_status_events_complaint_id_created_at_idx"
  ON "complaint_status_events"("complaint_id", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "complaint_status_events_kind_created_at_idx"
  ON "complaint_status_events"("kind", "created_at" DESC);

DO $$ BEGIN
  ALTER TABLE "citizen_complaints"
    ADD CONSTRAINT "citizen_complaints_assignee_id_fkey"
    FOREIGN KEY ("assignee_id") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "complaint_status_events"
    ADD CONSTRAINT "complaint_status_events_complaint_id_fkey"
    FOREIGN KEY ("complaint_id") REFERENCES "citizen_complaints"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "complaint_status_events"
    ADD CONSTRAINT "complaint_status_events_actor_user_id_fkey"
    FOREIGN KEY ("actor_user_id") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
