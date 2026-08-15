-- Phase 7: sixth Local DSS seat — Chattogram-11 (Patiya) onboard
-- Unit + empty focus-area wards only. No complaints / outages / specialty seed.
-- Password: ChangeMe@123

INSERT INTO admin_units (id, code, name, name_bn, type, parent_id, path, geo_json, created_at, updated_at)
VALUES
  (
    'c8000001-0001-4001-8001-000000000011',
    'CTG-11',
    'Chattogram-11',
    'চট্টগ্রাম-১১',
    'CONSTITUENCY',
    'b2000001-0001-4001-8001-000000000004',
    '/a1000001-0001-4001-8001-000000000002/b2000001-0001-4001-8001-000000000004/c8000001-0001-4001-8001-000000000011',
    '{"type":"Point","coordinates":[91.81,22.29]}',
    NOW(), NOW()
  )
ON CONFLICT (type, code) DO UPDATE SET
  name = EXCLUDED.name,
  name_bn = EXCLUDED.name_bn,
  parent_id = EXCLUDED.parent_id,
  path = EXCLUDED.path,
  geo_json = EXCLUDED.geo_json,
  updated_at = NOW();

INSERT INTO admin_units (id, code, name, name_bn, type, parent_id, path, geo_json, created_at, updated_at)
VALUES
  ('cc000001-0001-4001-8001-000000000011', 'CTG-11-A1', 'Patiya', 'পটিয়া', 'WARD',
   'c8000001-0001-4001-8001-000000000011',
   '/a1000001-0001-4001-8001-000000000002/b2000001-0001-4001-8001-000000000004/c8000001-0001-4001-8001-000000000011/cc000001-0001-4001-8001-000000000011',
   '{"type":"Point","coordinates":[91.81,22.295]}', NOW(), NOW()),
  ('cc000001-0001-4001-8001-000000000012', 'CTG-11-A2', 'Anowara', 'আনোয়ারা', 'WARD',
   'c8000001-0001-4001-8001-000000000011',
   '/a1000001-0001-4001-8001-000000000002/b2000001-0001-4001-8001-000000000004/c8000001-0001-4001-8001-000000000011/cc000001-0001-4001-8001-000000000012',
   '{"type":"Point","coordinates":[91.82,22.22]}', NOW(), NOW()),
  ('cc000001-0001-4001-8001-000000000013', 'CTG-11-A3', 'Chandanaish', 'চন্দনাইশ', 'WARD',
   'c8000001-0001-4001-8001-000000000011',
   '/a1000001-0001-4001-8001-000000000002/b2000001-0001-4001-8001-000000000004/c8000001-0001-4001-8001-000000000011/cc000001-0001-4001-8001-000000000013',
   '{"type":"Point","coordinates":[92.02,22.21]}', NOW(), NOW())
ON CONFLICT (type, code) DO UPDATE SET
  name = EXCLUDED.name,
  name_bn = EXCLUDED.name_bn,
  parent_id = EXCLUDED.parent_id,
  path = EXCLUDED.path,
  updated_at = NOW();

INSERT INTO representatives (id, name, nid, role, party, tenure_start, tenure_end, admin_unit_id, created_at, updated_at)
VALUES
  (
    'd4000001-0001-4001-8001-000000000106',
    'MP — Chattogram-11 (Demo)',
    '2000000000106',
    'MP',
    'Local DSS',
    '2026-02-15',
    NULL,
    'c8000001-0001-4001-8001-000000000011',
    NOW(), NOW()
  )
ON CONFLICT (nid) DO UPDATE SET
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  party = EXCLUDED.party,
  tenure_start = EXCLUDED.tenure_start,
  tenure_end = NULL,
  admin_unit_id = EXCLUDED.admin_unit_id,
  updated_at = NOW();

INSERT INTO users (id, email, password_hash, role, is_active, admin_unit_id, phone, created_at, updated_at)
VALUES
  (
    'a1000001-0001-4001-8001-000000000106',
    'mp.ctg11@geoinsight.gov.bd',
    '$2b$12$VshTVUC3IBQ8rdl7JioofOGEezxO5yV9bYJGeEr0R1qYYql9ujVnW',
    'MP', true,
    'c8000001-0001-4001-8001-000000000011',
    '+8801811000011',
    NOW(), NOW()
  )
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role,
  is_active = true,
  admin_unit_id = EXCLUDED.admin_unit_id,
  phone = EXCLUDED.phone,
  updated_at = NOW();
