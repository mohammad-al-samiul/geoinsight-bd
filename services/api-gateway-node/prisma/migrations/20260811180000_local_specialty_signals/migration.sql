-- P3 Local Entity DSS: role specialty signals

CREATE TYPE "SpecialtySignalStatus" AS ENUM ('OK', 'WATCH', 'ALERT', 'IN_PROGRESS');

CREATE TABLE "local_specialty_signals" (
    "id" UUID NOT NULL,
    "module_id" VARCHAR(64) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "title_bn" VARCHAR(255),
    "detail" TEXT,
    "detail_bn" TEXT,
    "status" "SpecialtySignalStatus" NOT NULL DEFAULT 'WATCH',
    "metric_label" VARCHAR(64),
    "metric_label_bn" VARCHAR(64),
    "metric_value" DECIMAL(18,4),
    "metric_unit" VARCHAR(32),
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "recorded_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ward_id" UUID,
    "entity_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "local_specialty_signals_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "local_specialty_signals_entity_id_module_id_recorded_at_idx"
  ON "local_specialty_signals"("entity_id", "module_id", "recorded_at" DESC);
CREATE INDEX "local_specialty_signals_entity_id_status_recorded_at_idx"
  ON "local_specialty_signals"("entity_id", "status", "recorded_at" DESC);
CREATE INDEX "local_specialty_signals_module_id_status_idx"
  ON "local_specialty_signals"("module_id", "status");

ALTER TABLE "local_specialty_signals"
  ADD CONSTRAINT "local_specialty_signals_ward_id_fkey"
  FOREIGN KEY ("ward_id") REFERENCES "admin_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "local_specialty_signals"
  ADD CONSTRAINT "local_specialty_signals_entity_id_fkey"
  FOREIGN KEY ("entity_id") REFERENCES "admin_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;
