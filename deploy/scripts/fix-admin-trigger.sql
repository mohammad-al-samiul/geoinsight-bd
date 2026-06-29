-- Fix admin_units ancestor trigger (MAX(uuid) is invalid in PostgreSQL)
CREATE OR REPLACE FUNCTION geoinsight_sync_admin_unit_ancestors()
RETURNS TRIGGER AS $$
DECLARE
  div_id UUID;
  dist_id UUID;
  upa_id UUID;
BEGIN
  WITH RECURSIVE ancestors AS (
    SELECT id, "type", "parent_id" FROM "admin_units" WHERE id = NEW.id
    UNION ALL
    SELECT p.id, p."type", p."parent_id"
    FROM "admin_units" p
    INNER JOIN ancestors a ON p.id = a."parent_id"
  )
  SELECT
    (SELECT a.id FROM ancestors a WHERE a."type" = 'DIVISION' LIMIT 1),
    (SELECT a.id FROM ancestors a WHERE a."type" = 'DISTRICT' LIMIT 1),
    (SELECT a.id FROM ancestors a WHERE a."type" = 'UPAZILA' LIMIT 1)
  INTO div_id, dist_id, upa_id;

  IF NEW."type" = 'DIVISION' THEN div_id := NEW.id; END IF;
  IF NEW."type" = 'DISTRICT' THEN dist_id := NEW.id; END IF;
  IF NEW."type" = 'UPAZILA' THEN upa_id := NEW.id; END IF;

  NEW."division_id" := div_id;
  NEW."district_id" := dist_id;
  NEW."upazila_id"  := upa_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
