CREATE TYPE "LiveSignalType" AS ENUM ('PROJECT', 'REPRESENTATIVE', 'ALERT', 'POLICY');

CREATE TABLE IF NOT EXISTS live_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_type "LiveSignalType" NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  url VARCHAR(2048) NOT NULL UNIQUE,
  source_name VARCHAR(128) NOT NULL,
  district VARCHAR(64),
  division VARCHAR(64),
  admin_unit_id UUID,
  severity INT,
  flag_type VARCHAR(32),
  sentiment_category "IngestionSentiment",
  article_id UUID,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS live_signals_type_created_idx ON live_signals (signal_type, created_at DESC);
CREATE INDEX IF NOT EXISTS live_signals_district_type_idx ON live_signals (district, signal_type);
CREATE INDEX IF NOT EXISTS live_signals_admin_unit_idx ON live_signals (admin_unit_id);
