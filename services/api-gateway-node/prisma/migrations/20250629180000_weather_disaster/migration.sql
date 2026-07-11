-- Live weather observations + disaster alerts
CREATE TABLE IF NOT EXISTS weather_observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  division VARCHAR(64) NOT NULL,
  name_bn VARCHAR(64) NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  temp_c DECIMAL(5, 2) NOT NULL,
  humidity_pct INT NOT NULL,
  precipitation_mm DECIMAL(8, 2) NOT NULL,
  wind_speed_kmh DECIMAL(6, 2) NOT NULL,
  weather_code INT NOT NULL,
  weather_label VARCHAR(64) NOT NULL,
  weather_label_bn VARCHAR(64) NOT NULL,
  flood_risk INT NOT NULL,
  cyclone_risk INT NOT NULL,
  heat_stress INT NOT NULL,
  population_at_risk INT NOT NULL,
  source VARCHAR(32) NOT NULL DEFAULT 'open-meteo',
  recorded_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS weather_observations_division_recorded_idx
  ON weather_observations (division, recorded_at DESC);

CREATE INDEX IF NOT EXISTS weather_observations_recorded_idx
  ON weather_observations (recorded_at DESC);

CREATE TABLE IF NOT EXISTS disaster_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id VARCHAR(512) NOT NULL UNIQUE,
  alert_type VARCHAR(32) NOT NULL,
  severity INT NOT NULL,
  title TEXT NOT NULL,
  title_bn TEXT,
  description TEXT,
  division VARCHAR(64),
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  population_at_risk INT,
  valid_from TIMESTAMPTZ NOT NULL,
  valid_to TIMESTAMPTZ,
  source VARCHAR(32) NOT NULL DEFAULT 'gdacs',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS disaster_alerts_type_active_idx
  ON disaster_alerts (alert_type, is_active);

CREATE INDEX IF NOT EXISTS disaster_alerts_division_active_idx
  ON disaster_alerts (division, is_active);
