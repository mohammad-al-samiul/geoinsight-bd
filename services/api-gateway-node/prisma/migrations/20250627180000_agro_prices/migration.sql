-- Live agro market prices from commodity pipeline
ALTER TABLE agro_markets
  ADD COLUMN IF NOT EXISTS commodity_code VARCHAR(50),
  ADD COLUMN IF NOT EXISTS price_bdt_per_kg DECIMAL(18, 4),
  ADD COLUMN IF NOT EXISTS price_updated_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS agro_markets_price_updated_idx
  ON agro_markets (price_updated_at DESC NULLS LAST);
