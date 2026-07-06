-- Extended KPI definitions + 12-month time series per representative

ALTER TABLE kpi_definitions ADD COLUMN IF NOT EXISTS name_bn VARCHAR(255);

INSERT INTO kpi_definitions (id, code, name, name_bn, unit, applies_to, created_at)
VALUES
  ('c3000001-0001-4001-8001-000000000005', 'ROAD_COMPLETION', 'Road Infrastructure Completion', 'সড়ক অবকাঠামো সম্পন্নতা', '%', 'REPRESENTATIVE', NOW()),
  ('c3000001-0001-4001-8001-000000000006', 'HEALTH_COVERAGE', 'Health Service Coverage', 'স্বাস্থ্যসেবা কভারেজ', '%', 'REPRESENTATIVE', NOW()),
  ('c3000001-0001-4001-8001-000000000007', 'DIGITAL_SERVICE', 'Digital Service Delivery', 'ডিজিটাল সেবা প্রদান', '%', 'REPRESENTATIVE', NOW()),
  ('c3000001-0001-4001-8001-000000000008', 'AGRI_GROWTH', 'Agricultural Output Growth', 'কৃষি উৎপাদন প্রবৃদ্ধি', '%', 'ADMIN_UNIT', NOW())
ON CONFLICT (code) DO UPDATE SET name_bn = EXCLUDED.name_bn;

INSERT INTO kpi_records (id, value, recorded_at, fiscal_year, status, verified, representative_id, kpi_def_id, created_at)
SELECT gen_random_uuid(),
  55 + (random() * 40)::numeric(18,4),
  NOW() - (m.months || ' months')::interval,
  '2025', 'VERIFIED', true, r.rep::uuid, d.def::uuid, NOW()
FROM generate_series(0, 11) AS m(months)
CROSS JOIN (VALUES
  ('d4000001-0001-4001-8001-000000000001'),
  ('d4000001-0001-4001-8001-000000000002'),
  ('d4000001-0001-4001-8001-000000000003'),
  ('d4000001-0001-4001-8001-000000000004'),
  ('d4000001-0001-4001-8001-000000000005'),
  ('d4000001-0001-4001-8001-000000000010'),
  ('d4000001-0001-4001-8001-000000000011'),
  ('d4000001-0001-4001-8001-000000000012')
) AS r(rep)
CROSS JOIN (VALUES
  ('c3000001-0001-4001-8001-000000000001'),
  ('c3000001-0001-4001-8001-000000000002'),
  ('c3000001-0001-4001-8001-000000000003'),
  ('c3000001-0001-4001-8001-000000000004')
) AS d(def)
WHERE (SELECT COUNT(*) FROM kpi_records WHERE fiscal_year = '2025') < 384;
