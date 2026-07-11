ALTER TABLE weather_observations
  ADD COLUMN IF NOT EXISTS district VARCHAR(64);

CREATE INDEX IF NOT EXISTS weather_observations_district_recorded_idx
  ON weather_observations (district, recorded_at DESC);
