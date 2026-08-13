-- P4: outbound WhatsApp / voice alert delivery audit

CREATE TYPE "AlertDeliveryChannel" AS ENUM ('WHATSAPP', 'VOICE', 'SMS');
CREATE TYPE "AlertDeliveryStatus" AS ENUM ('QUEUED', 'SENT', 'DRY_RUN', 'FAILED');

CREATE TABLE "alert_delivery_logs" (
    "id" UUID NOT NULL,
    "channel" "AlertDeliveryChannel" NOT NULL,
    "status" "AlertDeliveryStatus" NOT NULL DEFAULT 'QUEUED',
    "to_address" VARCHAR(64) NOT NULL,
    "body_preview" VARCHAR(512) NOT NULL,
    "provider_ref" VARCHAR(128),
    "error" TEXT,
    "source_kind" VARCHAR(64) NOT NULL,
    "source_id" UUID,
    "entity_id" UUID,
    "payload" JSONB,
    "user_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "alert_delivery_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "alert_delivery_logs_entity_id_created_at_idx"
  ON "alert_delivery_logs"("entity_id", "created_at" DESC);
CREATE INDEX "alert_delivery_logs_channel_status_created_at_idx"
  ON "alert_delivery_logs"("channel", "status", "created_at" DESC);
CREATE INDEX "alert_delivery_logs_source_kind_source_id_idx"
  ON "alert_delivery_logs"("source_kind", "source_id");

ALTER TABLE "alert_delivery_logs"
  ADD CONSTRAINT "alert_delivery_logs_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
