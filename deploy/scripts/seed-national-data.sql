-- GeoInsight BD — Core national reference (idempotent)
-- Divisions + base KPI definitions. Extended data in deploy/scripts/seed/*.sql

-- ── 8 Divisions (BBS-aligned, real coordinates) ─────────────────────────────
INSERT INTO admin_units (id, code, name, name_bn, type, parent_id, path, geo_json, created_at, updated_at)
VALUES
  ('a1000001-0001-4001-8001-000000000001', '30', 'Dhaka', 'ঢাকা', 'DIVISION', NULL, '/a1000001-0001-4001-8001-000000000001', '{"type":"Point","coordinates":[90.412518,23.810332]}', NOW(), NOW()),
  ('a1000001-0001-4001-8001-000000000002', '20', 'Chattogram', 'চট্টগ্রাম', 'DIVISION', NULL, '/a1000001-0001-4001-8001-000000000002', '{"type":"Point","coordinates":[91.783182,22.356851]}', NOW(), NOW()),
  ('a1000001-0001-4001-8001-000000000003', '40', 'Khulna', 'খুলনা', 'DIVISION', NULL, '/a1000001-0001-4001-8001-000000000003', '{"type":"Point","coordinates":[89.540328,22.845641]}', NOW(), NOW()),
  ('a1000001-0001-4001-8001-000000000004', '50', 'Rajshahi', 'রাজশাহী', 'DIVISION', NULL, '/a1000001-0001-4001-8001-000000000004', '{"type":"Point","coordinates":[88.624135,24.363589]}', NOW(), NOW()),
  ('a1000001-0001-4001-8001-000000000005', '60', 'Sylhet', 'সিলেট', 'DIVISION', NULL, '/a1000001-0001-4001-8001-000000000005', '{"type":"Point","coordinates":[91.868706,24.894929]}', NOW(), NOW()),
  ('a1000001-0001-4001-8001-000000000006', '70', 'Rangpur', 'রংপুর', 'DIVISION', NULL, '/a1000001-0001-4001-8001-000000000006', '{"type":"Point","coordinates":[89.275227,25.743892]}', NOW(), NOW()),
  ('a1000001-0001-4001-8001-000000000007', '80', 'Barishal', 'বরিশাল', 'DIVISION', NULL, '/a1000001-0001-4001-8001-000000000007', '{"type":"Point","coordinates":[90.353451,22.701002]}', NOW(), NOW()),
  ('a1000001-0001-4001-8001-000000000008', '90', 'Mymensingh', 'ময়মনসিংহ', 'DIVISION', NULL, '/a1000001-0001-4001-8001-000000000008', '{"type":"Point","coordinates":[90.420273,24.747149]}', NOW(), NOW())
ON CONFLICT (type, code) DO UPDATE SET
  name = EXCLUDED.name,
  name_bn = EXCLUDED.name_bn,
  geo_json = EXCLUDED.geo_json,
  updated_at = NOW();

ALTER TABLE kpi_definitions ADD COLUMN IF NOT EXISTS name_bn VARCHAR(255);

INSERT INTO kpi_definitions (id, code, name, name_bn, unit, applies_to, created_at)
VALUES
  ('c3000001-0001-4001-8001-000000000001', 'COMPLETION', 'Project Completion Rate', 'প্রকল্প সম্পন্নতার হার', '%', 'REPRESENTATIVE', NOW()),
  ('c3000001-0001-4001-8001-000000000002', 'BUDGET_UTIL', 'Budget Utilization', 'বাজেট বাস্তবায়ন', '%', 'REPRESENTATIVE', NOW()),
  ('c3000001-0001-4001-8001-000000000003', 'GRIEVANCE', 'Grievance Resolution', 'অভিযোগ নিষ্পত্তি', '%', 'REPRESENTATIVE', NOW()),
  ('c3000001-0001-4001-8001-000000000004', 'ATTENDANCE', 'Parliament Attendance', 'সংসদ উপস্থিতি', '%', 'REPRESENTATIVE', NOW())
ON CONFLICT (code) DO UPDATE SET name_bn = EXCLUDED.name_bn;
