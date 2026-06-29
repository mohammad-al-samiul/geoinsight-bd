-- GeoInsight BD — National operational seed (idempotent)

-- ── 8 Divisions ─────────────────────────────────────────────────────────────
INSERT INTO admin_units (id, code, name, name_bn, type, parent_id, path, geo_json, created_at, updated_at)
VALUES
  ('a1000001-0001-4001-8001-000000000001', '30', 'Dhaka', 'ঢাকা', 'DIVISION', NULL, '/a1000001-0001-4001-8001-000000000001', '{"type":"Point","coordinates":[90.41,23.81]}', NOW(), NOW()),
  ('a1000001-0001-4001-8001-000000000002', '20', 'Chattogram', 'চট্টগ্রাম', 'DIVISION', NULL, '/a1000001-0001-4001-8001-000000000002', '{"type":"Point","coordinates":[91.83,22.35]}', NOW(), NOW()),
  ('a1000001-0001-4001-8001-000000000003', '40', 'Khulna', 'খুলনা', 'DIVISION', NULL, '/a1000001-0001-4001-8001-000000000003', '{"type":"Point","coordinates":[89.55,22.82]}', NOW(), NOW()),
  ('a1000001-0001-4001-8001-000000000004', '50', 'Rajshahi', 'রাজশাহী', 'DIVISION', NULL, '/a1000001-0001-4001-8001-000000000004', '{"type":"Point","coordinates":[88.60,24.37]}', NOW(), NOW()),
  ('a1000001-0001-4001-8001-000000000005', '60', 'Sylhet', 'সিলেট', 'DIVISION', NULL, '/a1000001-0001-4001-8001-000000000005', '{"type":"Point","coordinates":[91.87,24.90]}', NOW(), NOW()),
  ('a1000001-0001-4001-8001-000000000006', '70', 'Rangpur', 'রংপুর', 'DIVISION', NULL, '/a1000001-0001-4001-8001-000000000006', '{"type":"Point","coordinates":[89.25,25.75]}', NOW(), NOW()),
  ('a1000001-0001-4001-8001-000000000007', '80', 'Barishal', 'বরিশাল', 'DIVISION', NULL, '/a1000001-0001-4001-8001-000000000007', '{"type":"Point","coordinates":[90.37,22.70]}', NOW(), NOW()),
  ('a1000001-0001-4001-8001-000000000008', '90', 'Mymensingh', 'ময়মনসিংহ', 'DIVISION', NULL, '/a1000001-0001-4001-8001-000000000008', '{"type":"Point","coordinates":[90.41,24.75]}', NOW(), NOW())
ON CONFLICT (type, code) DO NOTHING;

INSERT INTO admin_units (id, code, name, name_bn, type, parent_id, path, geo_json, created_at, updated_at)
VALUES
  ('b2000001-0001-4001-8001-000000000001', '3026', 'Dhaka', 'ঢাকা', 'DISTRICT', 'a1000001-0001-4001-8001-000000000001', '/a1000001-0001-4001-8001-000000000001/b2000001-0001-4001-8001-000000000001', '{"type":"Point","coordinates":[90.41,23.78]}', NOW(), NOW()),
  ('b2000001-0001-4001-8001-000000000002', '3033', 'Gazipur', 'গাজীপুর', 'DISTRICT', 'a1000001-0001-4001-8001-000000000001', '/a1000001-0001-4001-8001-000000000001/b2000001-0001-4001-8001-000000000002', '{"type":"Point","coordinates":[90.42,24.00]}', NOW(), NOW()),
  ('b2000001-0001-4001-8001-000000000003', '3029', 'Faridpur', 'ফরিদপুর', 'DISTRICT', 'a1000001-0001-4001-8001-000000000001', '/a1000001-0001-4001-8001-000000000001/b2000001-0001-4001-8001-000000000003', '{"type":"Point","coordinates":[89.84,23.60]}', NOW(), NOW()),
  ('b2000001-0001-4001-8001-000000000004', '2015', 'Chattogram', 'চট্টগ্রাম', 'DISTRICT', 'a1000001-0001-4001-8001-000000000002', '/a1000001-0001-4001-8001-000000000002/b2000001-0001-4001-8001-000000000004', '{"type":"Point","coordinates":[91.83,22.33]}', NOW(), NOW()),
  ('b2000001-0001-4001-8001-000000000005', '2019', 'Cumilla', 'কুমিল্লা', 'DISTRICT', 'a1000001-0001-4001-8001-000000000002', '/a1000001-0001-4001-8001-000000000002/b2000001-0001-4001-8001-000000000005', '{"type":"Point","coordinates":[91.20,23.46]}', NOW(), NOW())
ON CONFLICT (type, code) DO NOTHING;

-- Optional column for bilingual KPI names (schema expects name_bn)
ALTER TABLE kpi_definitions ADD COLUMN IF NOT EXISTS name_bn VARCHAR(255);

INSERT INTO kpi_definitions (id, code, name, unit, applies_to, created_at)
VALUES
  ('c3000001-0001-4001-8001-000000000001', 'COMPLETION', 'Project Completion Rate', '%', 'REPRESENTATIVE', NOW()),
  ('c3000001-0001-4001-8001-000000000002', 'BUDGET_UTIL', 'Budget Utilization', '%', 'REPRESENTATIVE', NOW()),
  ('c3000001-0001-4001-8001-000000000003', 'GRIEVANCE', 'Grievance Resolution', '%', 'REPRESENTATIVE', NOW()),
  ('c3000001-0001-4001-8001-000000000004', 'ATTENDANCE', 'Parliament Attendance', '%', 'REPRESENTATIVE', NOW())
ON CONFLICT (code) DO NOTHING;

INSERT INTO representatives (id, name, nid, role, party, tenure_start, admin_unit_id, created_at, updated_at)
VALUES
  ('d4000001-0001-4001-8001-000000000001', 'Hon. Sheikh Hasina', '1000000000001', 'MINISTER', 'Awami League', '2009-01-06', 'a1000001-0001-4001-8001-000000000001', NOW(), NOW()),
  ('d4000001-0001-4001-8001-000000000002', 'Md. Raju Ahmed MP', '1000000000002', 'MP', 'Awami League', '2019-01-01', 'b2000001-0001-4001-8001-000000000001', NOW(), NOW()),
  ('d4000001-0001-4001-8001-000000000003', 'Dr. Fatema Khatun DC', '1000000000003', 'DC', 'BCS Admin', '2022-03-15', 'b2000001-0001-4001-8001-000000000002', NOW(), NOW()),
  ('d4000001-0001-4001-8001-000000000004', 'Abdul Karim MP', '1000000000004', 'MP', 'Awami League', '2019-01-01', 'b2000001-0001-4001-8001-000000000004', NOW(), NOW()),
  ('d4000001-0001-4001-8001-000000000005', 'Nasrin Akter DC', '1000000000005', 'DC', 'BCS Admin', '2021-06-01', 'b2000001-0001-4001-8001-000000000005', NOW(), NOW())
ON CONFLICT (nid) DO NOTHING;

INSERT INTO kpi_records (id, value, recorded_at, fiscal_year, status, verified, representative_id, kpi_def_id, created_at)
SELECT gen_random_uuid(), v.val, NOW() - (v.months || ' months')::interval, '2025', 'VERIFIED', true, v.rep::uuid, v.def::uuid, NOW()
FROM (VALUES
  (87.4::numeric, 0, 'd4000001-0001-4001-8001-000000000001', 'c3000001-0001-4001-8001-000000000001'),
  (82.1::numeric, 1, 'd4000001-0001-4001-8001-000000000001', 'c3000001-0001-4001-8001-000000000001'),
  (91.2::numeric, 0, 'd4000001-0001-4001-8001-000000000002', 'c3000001-0001-4001-8001-000000000002'),
  (76.8::numeric, 0, 'd4000001-0001-4001-8001-000000000003', 'c3000001-0001-4001-8001-000000000003'),
  (88.0::numeric, 0, 'd4000001-0001-4001-8001-000000000004', 'c3000001-0001-4001-8001-000000000001')
) AS v(val, months, rep, def)
WHERE NOT EXISTS (SELECT 1 FROM kpi_records LIMIT 1);

INSERT INTO projects (id, title, budget_allocated, budget_spent, status, contractor_nid, start_date, admin_unit_id, created_at, updated_at)
VALUES
  ('e5000001-0001-4001-8001-000000000001', 'Padma Bridge Southern Link', 12000, 11800, 'ONGOING', '2000000000001', '2022-01-15', 'b2000001-0001-4001-8001-000000000001', NOW(), NOW()),
  ('e5000001-0001-4001-8001-000000000002', 'Metro Rail Phase-6 Extension', 8500, 9200, 'ONGOING', '2000000000002', '2021-06-01', 'b2000001-0001-4001-8001-000000000001', NOW(), NOW()),
  ('e5000001-0001-4001-8001-000000000003', 'Rural Roads Upazila Network', 4500, 4100, 'ONGOING', '2000000000003', '2020-03-10', 'b2000001-0001-4001-8001-000000000002', NOW(), NOW()),
  ('e5000001-0001-4001-8001-000000000004', 'Upazila Health Complex Upgrade', 3200, 3800, 'ONGOING', '2000000000004', '2023-01-20', 'b2000001-0001-4001-8001-000000000003', NOW(), NOW()),
  ('e5000001-0001-4001-8001-000000000005', 'Irrigation Canal Rehabilitation', 2800, 2700, 'COMPLETED', '2000000000005', '2019-11-05', 'b2000001-0001-4001-8001-000000000004', NOW(), NOW()),
  ('e5000001-0001-4001-8001-000000000006', 'School Infrastructure Modernization', 2200, 2600, 'STALLED', '2000000000006', '2022-08-12', 'b2000001-0001-4001-8001-000000000005', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO red_flag_alerts (id, flag_type, severity, ai_explanation, project_id, created_at)
VALUES
  ('f6000001-0001-4001-8001-000000000001', 'BUDGET_OVERRUN', 4, 'AI detected 8.2% budget overrun — Metro Rail Phase-6', 'e5000001-0001-4001-8001-000000000002', NOW() - INTERVAL '2 days'),
  ('f6000001-0001-4001-8001-000000000002', 'DELAY', 3, 'Contractor milestone slip: 45 days behind on health complex', 'e5000001-0001-4001-8001-000000000004', NOW() - INTERVAL '5 days'),
  ('f6000001-0001-4001-8001-000000000003', 'CONTRACTOR_FRAUD', 5, 'Duplicate bidding pattern flagged on school upgrade', 'e5000001-0001-4001-8001-000000000006', NOW() - INTERVAL '1 day'),
  ('f6000001-0001-4001-8001-000000000004', 'QUALITY', 2, 'Materials test failure at rural roads KM-12', 'e5000001-0001-4001-8001-000000000003', NOW() - INTERVAL '7 days'),
  ('f6000001-0001-4001-8001-000000000005', 'CORRUPTION_RISK', 4, 'Payment velocity anomaly on school upgrade', 'e5000001-0001-4001-8001-000000000006', NOW() - INTERVAL '3 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO agro_markets (id, name, lat, lng, type, admin_unit_id, created_at)
VALUES
  ('a7000001-0001-4001-8001-000000000001', 'Karwan Bazar Wholesale', 23.75, 90.39, 'WHOLESALE', 'b2000001-0001-4001-8001-000000000001', NOW()),
  ('a7000001-0001-4001-8001-000000000002', 'Badamtoli Arat', 23.71, 90.41, 'MANDI', 'b2000001-0001-4001-8001-000000000001', NOW()),
  ('a7000001-0001-4001-8001-000000000003', 'Tongi Krishi Haat', 23.89, 90.40, 'HAAT', 'b2000001-0001-4001-8001-000000000002', NOW()),
  ('a7000001-0001-4001-8001-000000000004', 'Chattogram Khatunganj', 22.34, 91.83, 'WHOLESALE', 'b2000001-0001-4001-8001-000000000004', NOW()),
  ('a7000001-0001-4001-8001-000000000005', 'Cumilla Bazar', 23.46, 91.18, 'RETAIL', 'b2000001-0001-4001-8001-000000000005', NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO commodity_price_logs (commodity_code, country_code, country_name, unit_price_usd, shipping_cost_usd, tariff_rate, landed_cost_usd, source_rank, created_at)
SELECT v.commodity, v.cc, v.cn, v.price, v.ship, 0.05, v.price + v.ship + v.price * 0.05, v.rank, NOW()
FROM (VALUES
  ('RICE', 'IND', 'India', 420::numeric, 35::numeric, 1),
  ('RICE', 'NPL', 'Nepal', 445::numeric, 28::numeric, 2),
  ('RICE', 'MMR', 'Myanmar', 410::numeric, 42::numeric, 3),
  ('WHEAT', 'IND', 'India', 280::numeric, 30::numeric, 1),
  ('WHEAT', 'PAK', 'Pakistan', 265::numeric, 38::numeric, 2),
  ('ONION', 'IND', 'India', 380::numeric, 25::numeric, 1),
  ('ONION', 'TUR', 'Turkey', 340::numeric, 48::numeric, 2),
  ('LENTIL', 'IND', 'India', 520::numeric, 32::numeric, 1),
  ('LENTIL', 'CAN', 'Canada', 490::numeric, 60::numeric, 2)
) AS v(commodity, cc, cn, price, ship, rank)
WHERE NOT EXISTS (SELECT 1 FROM commodity_price_logs LIMIT 1);
