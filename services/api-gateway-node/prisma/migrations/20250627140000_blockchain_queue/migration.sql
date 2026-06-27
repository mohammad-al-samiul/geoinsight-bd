-- Hyperledger Fabric milestone queue (offline retry fallback)

CREATE TYPE "BlockchainTxStatus" AS ENUM ('PENDING', 'SUBMITTED', 'FAILED', 'DEAD_LETTER');

CREATE TABLE "blockchain_milestone_queue" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "representative_id" UUID NOT NULL,
    "allocated_budget" DECIMAL(18,2) NOT NULL,
    "spending_variance" DECIMAL(18,4) NOT NULL,
    "progress_percentage" DECIMAL(5,2) NOT NULL,
    "payload_hash" VARCHAR(64) NOT NULL,
    "status" "BlockchainTxStatus" NOT NULL DEFAULT 'PENDING',
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "max_retries" INTEGER NOT NULL DEFAULT 5,
    "last_error" TEXT,
    "fabric_tx_id" VARCHAR(128),
    "chaincode_name" VARCHAR(120) NOT NULL,
    "next_retry_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "blockchain_milestone_queue_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "blockchain_milestone_queue_payload_hash_key"
  ON "blockchain_milestone_queue"("payload_hash");
CREATE INDEX "blockchain_milestone_queue_status_next_retry_at_idx"
  ON "blockchain_milestone_queue"("status", "next_retry_at");
CREATE INDEX "blockchain_milestone_queue_project_id_idx"
  ON "blockchain_milestone_queue"("project_id");

ALTER TABLE "blockchain_milestone_queue"
  ADD CONSTRAINT "blockchain_milestone_queue_project_id_fkey"
  FOREIGN KEY ("project_id") REFERENCES "projects"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
