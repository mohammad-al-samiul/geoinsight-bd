-- Optimized national chart series store (upsert-friendly unique key)
CREATE TABLE IF NOT EXISTS metric_time_series (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module VARCHAR(64) NOT NULL,
  series_key VARCHAR(128) NOT NULL,
  period_key VARCHAR(32) NOT NULL,
  label VARCHAR(64),
  value DECIMAL(18, 4) NOT NULL,
  meta JSONB,
  recorded_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS metric_time_series_module_series_period_uidx
  ON metric_time_series (module, series_key, period_key);

CREATE INDEX IF NOT EXISTS metric_time_series_module_series_recorded_idx
  ON metric_time_series (module, series_key, recorded_at DESC);

CREATE INDEX IF NOT EXISTS metric_time_series_module_recorded_idx
  ON metric_time_series (module, recorded_at DESC);
