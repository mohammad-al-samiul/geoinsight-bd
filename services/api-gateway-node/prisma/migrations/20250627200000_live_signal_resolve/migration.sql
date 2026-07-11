ALTER TABLE live_signals
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS resolved_by UUID;

CREATE INDEX IF NOT EXISTS live_signals_unresolved_idx
  ON live_signals (signal_type, resolved_at)
  WHERE resolved_at IS NULL;
