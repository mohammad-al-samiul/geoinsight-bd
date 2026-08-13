-- Wave B: complaint photo QA advisory fields
ALTER TABLE "citizen_complaints"
  ADD COLUMN IF NOT EXISTS "photo_qa_status" VARCHAR(24),
  ADD COLUMN IF NOT EXISTS "photo_qa_score" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "photo_qa_note" TEXT;
