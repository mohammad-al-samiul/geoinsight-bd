-- P0 Local Entity Layer: CTG-8/9/10 + CCC (41 wards) + COCC (27 wards) + demo users
-- Password for all demo users: ChangeMe@123
-- Hash: $2b$12$VshTVUC3IBQ8rdl7JioofOGEezxO5yV9bYJGeEr0R1qYYql9ujVnW

-- Parents
-- Chattogram division: a1000001-0001-4001-8001-000000000002
-- Chattogram district: b2000001-0001-4001-8001-000000000004
-- Cumilla district:    b2000001-0001-4001-8001-000000000005

INSERT INTO admin_units (id, code, name, name_bn, type, parent_id, path, geo_json, created_at, updated_at)
VALUES
  (
    'c8000001-0001-4001-8001-000000000008',
    'CTG-8',
    'Chattogram-8',
    'চট্টগ্রাম-৮',
    'CONSTITUENCY',
    'b2000001-0001-4001-8001-000000000004',
    '/a1000001-0001-4001-8001-000000000002/b2000001-0001-4001-8001-000000000004/c8000001-0001-4001-8001-000000000008',
    '{"type":"Point","coordinates":[91.86,22.38]}',
    NOW(), NOW()
  ),
  (
    'c8000001-0001-4001-8001-000000000009',
    'CTG-9',
    'Chattogram-9',
    'চট্টগ্রাম-৯',
    'CONSTITUENCY',
    'b2000001-0001-4001-8001-000000000004',
    '/a1000001-0001-4001-8001-000000000002/b2000001-0001-4001-8001-000000000004/c8000001-0001-4001-8001-000000000009',
    '{"type":"Point","coordinates":[91.84,22.33]}',
    NOW(), NOW()
  ),
  (
    'c8000001-0001-4001-8001-000000000010',
    'CTG-10',
    'Chattogram-10',
    'চট্টগ্রাম-১০',
    'CONSTITUENCY',
    'b2000001-0001-4001-8001-000000000004',
    '/a1000001-0001-4001-8001-000000000002/b2000001-0001-4001-8001-000000000004/c8000001-0001-4001-8001-000000000010',
    '{"type":"Point","coordinates":[91.80,22.34]}',
    NOW(), NOW()
  ),
  (
    'c9000001-0001-4001-8001-000000000001',
    'CCC',
    'Chattogram City Corporation',
    'চট্টগ্রাম সিটি কর্পোরেশন',
    'CITY_CORPORATION',
    'b2000001-0001-4001-8001-000000000004',
    '/a1000001-0001-4001-8001-000000000002/b2000001-0001-4001-8001-000000000004/c9000001-0001-4001-8001-000000000001',
    '{"type":"Point","coordinates":[91.8317,22.3569]}',
    NOW(), NOW()
  ),
  (
    'c9000001-0001-4001-8001-000000000002',
    'COCC',
    'Cumilla City Corporation',
    'কুমিল্লা সিটি কর্পোরেশন',
    'CITY_CORPORATION',
    'b2000001-0001-4001-8001-000000000005',
    '/a1000001-0001-4001-8001-000000000002/b2000001-0001-4001-8001-000000000005/c9000001-0001-4001-8001-000000000002',
    '{"type":"Point","coordinates":[91.1809,23.4607]}',
    NOW(), NOW()
  )
ON CONFLICT (type, code) DO UPDATE SET
  name = EXCLUDED.name,
  name_bn = EXCLUDED.name_bn,
  parent_id = EXCLUDED.parent_id,
  path = EXCLUDED.path,
  geo_json = EXCLUDED.geo_json,
  updated_at = NOW();

-- Constituency focus areas (stored as WARD children for hierarchy scope)
INSERT INTO admin_units (id, code, name, name_bn, type, parent_id, path, geo_json, created_at, updated_at)
VALUES
  ('cc000001-0001-4001-8001-000000000001', 'CTG-8-A1', 'Boalkhali', 'বোয়ালখালী', 'WARD',
   'c8000001-0001-4001-8001-000000000008',
   '/a1000001-0001-4001-8001-000000000002/b2000001-0001-4001-8001-000000000004/c8000001-0001-4001-8001-000000000008/cc000001-0001-4001-8001-000000000001',
   '{"type":"Point","coordinates":[91.92,22.38]}', NOW(), NOW()),
  ('cc000001-0001-4001-8001-000000000002', 'CTG-8-A2', 'Chandgaon', 'চান্দগাঁও', 'WARD',
   'c8000001-0001-4001-8001-000000000008',
   '/a1000001-0001-4001-8001-000000000002/b2000001-0001-4001-8001-000000000004/c8000001-0001-4001-8001-000000000008/cc000001-0001-4001-8001-000000000002',
   '{"type":"Point","coordinates":[91.87,22.39]}', NOW(), NOW()),
  ('cc000001-0001-4001-8001-000000000003', 'CTG-8-A3', 'Panchlaish', 'পঞ্চলাইশ', 'WARD',
   'c8000001-0001-4001-8001-000000000008',
   '/a1000001-0001-4001-8001-000000000002/b2000001-0001-4001-8001-000000000004/c8000001-0001-4001-8001-000000000008/cc000001-0001-4001-8001-000000000003',
   '{"type":"Point","coordinates":[91.83,22.37]}', NOW(), NOW()),
  ('cc000001-0001-4001-8001-000000000004', 'CTG-9-A1', 'Kotwali', 'কোতোয়ালী', 'WARD',
   'c8000001-0001-4001-8001-000000000009',
   '/a1000001-0001-4001-8001-000000000002/b2000001-0001-4001-8001-000000000004/c8000001-0001-4001-8001-000000000009/cc000001-0001-4001-8001-000000000004',
   '{"type":"Point","coordinates":[91.834,22.341]}', NOW(), NOW()),
  ('cc000001-0001-4001-8001-000000000005', 'CTG-9-A2', 'Bakalia', 'বাকলিয়া', 'WARD',
   'c8000001-0001-4001-8001-000000000009',
   '/a1000001-0001-4001-8001-000000000002/b2000001-0001-4001-8001-000000000004/c8000001-0001-4001-8001-000000000009/cc000001-0001-4001-8001-000000000005',
   '{"type":"Point","coordinates":[91.86,22.34]}', NOW(), NOW()),
  ('cc000001-0001-4001-8001-000000000006', 'CTG-9-A3', 'Chawk Bazar', 'চকবাজার', 'WARD',
   'c8000001-0001-4001-8001-000000000009',
   '/a1000001-0001-4001-8001-000000000002/b2000001-0001-4001-8001-000000000004/c8000001-0001-4001-8001-000000000009/cc000001-0001-4001-8001-000000000006',
   '{"type":"Point","coordinates":[91.84,22.35]}', NOW(), NOW()),
  ('cc000001-0001-4001-8001-000000000007', 'CTG-10-A1', 'Double Mooring', 'ডবলমুরিং', 'WARD',
   'c8000001-0001-4001-8001-000000000010',
   '/a1000001-0001-4001-8001-000000000002/b2000001-0001-4001-8001-000000000004/c8000001-0001-4001-8001-000000000010/cc000001-0001-4001-8001-000000000007',
   '{"type":"Point","coordinates":[91.80,22.32]}', NOW(), NOW()),
  ('cc000001-0001-4001-8001-000000000008', 'CTG-10-A2', 'Pahartali', 'পাহাড়তলী', 'WARD',
   'c8000001-0001-4001-8001-000000000010',
   '/a1000001-0001-4001-8001-000000000002/b2000001-0001-4001-8001-000000000004/c8000001-0001-4001-8001-000000000010/cc000001-0001-4001-8001-000000000008',
   '{"type":"Point","coordinates":[91.79,22.36]}', NOW(), NOW()),
  ('cc000001-0001-4001-8001-000000000009', 'CTG-10-A3', 'Halishahar', 'হালিশহর', 'WARD',
   'c8000001-0001-4001-8001-000000000010',
   '/a1000001-0001-4001-8001-000000000002/b2000001-0001-4001-8001-000000000004/c8000001-0001-4001-8001-000000000010/cc000001-0001-4001-8001-000000000009',
   '{"type":"Point","coordinates":[91.78,22.34]}', NOW(), NOW())
ON CONFLICT (type, code) DO UPDATE SET
  name = EXCLUDED.name,
  name_bn = EXCLUDED.name_bn,
  parent_id = EXCLUDED.parent_id,
  path = EXCLUDED.path,
  updated_at = NOW();

-- CCC wards 1–41
INSERT INTO admin_units (id, code, name, name_bn, type, parent_id, path, geo_json, created_at, updated_at)
SELECT
  ('ca000001-0001-4001-8001-' || lpad(g::text, 12, '0'))::uuid,
  'CCC-W' || lpad(g::text, 2, '0'),
  'CCC Ward ' || g,
  'সিসিসি ওয়ার্ড ' || g,
  'WARD',
  'c9000001-0001-4001-8001-000000000001',
  '/a1000001-0001-4001-8001-000000000002/b2000001-0001-4001-8001-000000000004/c9000001-0001-4001-8001-000000000001/ca000001-0001-4001-8001-' || lpad(g::text, 12, '0'),
  json_build_object(
    'type', 'Point',
    'coordinates', json_build_array(91.80 + (g % 10) * 0.004, 22.32 + (g / 10) * 0.004)
  )::jsonb,
  NOW(),
  NOW()
FROM generate_series(1, 41) AS g
ON CONFLICT (type, code) DO UPDATE SET
  name = EXCLUDED.name,
  name_bn = EXCLUDED.name_bn,
  parent_id = EXCLUDED.parent_id,
  path = EXCLUDED.path,
  updated_at = NOW();

-- COCC wards 1–27
INSERT INTO admin_units (id, code, name, name_bn, type, parent_id, path, geo_json, created_at, updated_at)
SELECT
  ('cb000001-0001-4001-8001-' || lpad(g::text, 12, '0'))::uuid,
  'COCC-W' || lpad(g::text, 2, '0'),
  'COCC Ward ' || g,
  'কুমিল্লা সিটি ওয়ার্ড ' || g,
  'WARD',
  'c9000001-0001-4001-8001-000000000002',
  '/a1000001-0001-4001-8001-000000000002/b2000001-0001-4001-8001-000000000005/c9000001-0001-4001-8001-000000000002/cb000001-0001-4001-8001-' || lpad(g::text, 12, '0'),
  json_build_object(
    'type', 'Point',
    'coordinates', json_build_array(91.17 + (g % 9) * 0.003, 23.45 + (g / 9) * 0.003)
  )::jsonb,
  NOW(),
  NOW()
FROM generate_series(1, 27) AS g
ON CONFLICT (type, code) DO UPDATE SET
  name = EXCLUDED.name,
  name_bn = EXCLUDED.name_bn,
  parent_id = EXCLUDED.parent_id,
  path = EXCLUDED.path,
  updated_at = NOW();

-- Representatives for the 5 local entities
INSERT INTO representatives (id, name, nid, role, party, tenure_start, tenure_end, admin_unit_id, created_at, updated_at)
VALUES
  ('d4000001-0001-4001-8001-000000000101', 'MP — Chattogram-8 (Demo)', '2000000000101', 'MP', 'Local DSS', '2026-02-15', NULL, 'c8000001-0001-4001-8001-000000000008', NOW(), NOW()),
  ('d4000001-0001-4001-8001-000000000102', 'MP — Chattogram-9 (Demo)', '2000000000102', 'MP', 'Local DSS', '2026-02-15', NULL, 'c8000001-0001-4001-8001-000000000009', NOW(), NOW()),
  ('d4000001-0001-4001-8001-000000000103', 'MP — Chattogram-10 (Demo)', '2000000000103', 'MP', 'Local DSS', '2026-02-15', NULL, 'c8000001-0001-4001-8001-000000000010', NOW(), NOW()),
  ('d4000001-0001-4001-8001-000000000104', 'Mayor — CCC (Demo)', '2000000000104', 'MAYOR', 'Local DSS', '2026-02-15', NULL, 'c9000001-0001-4001-8001-000000000001', NOW(), NOW()),
  ('d4000001-0001-4001-8001-000000000105', 'Mayor — COCC (Demo)', '2000000000105', 'MAYOR', 'Local DSS', '2026-02-15', NULL, 'c9000001-0001-4001-8001-000000000002', NOW(), NOW())
ON CONFLICT (nid) DO UPDATE SET
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  party = EXCLUDED.party,
  tenure_start = EXCLUDED.tenure_start,
  tenure_end = NULL,
  admin_unit_id = EXCLUDED.admin_unit_id,
  updated_at = NOW();

-- Demo login users (password: ChangeMe@123)
INSERT INTO users (id, email, password_hash, role, is_active, admin_unit_id, created_at, updated_at)
VALUES
  (
    'a1000001-0001-4001-8001-000000000101',
    'mp.ctg8@geoinsight.gov.bd',
    '$2b$12$VshTVUC3IBQ8rdl7JioofOGEezxO5yV9bYJGeEr0R1qYYql9ujVnW',
    'MP', true,
    'c8000001-0001-4001-8001-000000000008',
    NOW(), NOW()
  ),
  (
    'a1000001-0001-4001-8001-000000000102',
    'mp.ctg9@geoinsight.gov.bd',
    '$2b$12$VshTVUC3IBQ8rdl7JioofOGEezxO5yV9bYJGeEr0R1qYYql9ujVnW',
    'MP', true,
    'c8000001-0001-4001-8001-000000000009',
    NOW(), NOW()
  ),
  (
    'a1000001-0001-4001-8001-000000000103',
    'mp.ctg10@geoinsight.gov.bd',
    '$2b$12$VshTVUC3IBQ8rdl7JioofOGEezxO5yV9bYJGeEr0R1qYYql9ujVnW',
    'MP', true,
    'c8000001-0001-4001-8001-000000000010',
    NOW(), NOW()
  ),
  (
    'a1000001-0001-4001-8001-000000000104',
    'mayor.ccc@geoinsight.gov.bd',
    '$2b$12$VshTVUC3IBQ8rdl7JioofOGEezxO5yV9bYJGeEr0R1qYYql9ujVnW',
    'MAYOR', true,
    'c9000001-0001-4001-8001-000000000001',
    NOW(), NOW()
  ),
  (
    'a1000001-0001-4001-8001-000000000105',
    'mayor.cocc@geoinsight.gov.bd',
    '$2b$12$VshTVUC3IBQ8rdl7JioofOGEezxO5yV9bYJGeEr0R1qYYql9ujVnW',
    'MAYOR', true,
    'c9000001-0001-4001-8001-000000000002',
    NOW(), NOW()
  )
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role,
  is_active = true,
  admin_unit_id = EXCLUDED.admin_unit_id,
  updated_at = NOW();
