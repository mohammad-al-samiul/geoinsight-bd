-- Extra national dataset for Sovereign LLM context (idempotent)

INSERT INTO projects (id, title, budget_allocated, budget_spent, status, contractor_nid, start_date, admin_unit_id, created_at, updated_at)
VALUES
  ('e5000001-0001-4001-8001-000000000021', 'Dhaka-Ashulia Elevated Expressway (N8)', 12400, 3800, 'ONGOING', '2000000000021', '2022-03-01', 'b2000001-0001-4001-8001-000000000001', NOW(), NOW()),
  ('e5000001-0001-4001-8001-000000000022', 'Bangabandhu Sheikh Mujib Railway Bridge', 16800, 14200, 'ONGOING', '2000000000022', '2020-11-01', 'b2000001-0001-4001-8001-000000000003', NOW(), NOW()),
  ('e5000001-0001-4001-8001-000000000023', 'Sylhet Shahjalal Airport Expansion', 7200, 5100, 'ONGOING', '2000000000023', '2021-06-01', 'b2000001-0001-4001-8001-000000000154', NOW(), NOW()),
  ('e5000001-0001-4001-8001-000000000024', 'Cox''s Bazar Marine Drive Protection', 3400, 2900, 'ONGOING', '2000000000024', '2020-01-01', 'b2000001-0001-4001-8001-000000000145', NOW(), NOW()),
  ('e5000001-0001-4001-8001-000000000025', 'Rangpur Medical College Hospital', 4100, 3600, 'ONGOING', '2000000000025', '2019-09-01', 'b2000001-0001-4001-8001-000000000132', NOW(), NOW()),
  ('e5000001-0001-4001-8001-000000000026', 'Barishal Sher-e-Bangla Medical College Upgrade', 3800, 3400, 'ONGOING', '2000000000026', '2020-04-01', 'b2000001-0001-4001-8001-000000000135', NOW(), NOW()),
  ('e5000001-0001-4001-8001-000000000027', 'Khulna 330MW Power Plant (Orion)', 9800, 9200, 'COMPLETED', '2000000000027', '2018-07-01', 'b2000001-0001-4001-8001-000000000159', NOW(), NOW()),
  ('e5000001-0001-4001-8001-000000000028', 'Rajshahi Education City', 2600, 1800, 'ONGOING', '2000000000028', '2021-01-01', 'b2000001-0001-4001-8001-000000000124', NOW(), NOW()),
  ('e5000001-0001-4001-8001-000000000029', 'Mymensingh Fisheries Research Institute', 1900, 1750, 'COMPLETED', '2000000000029', '2019-03-01', 'b2000001-0001-4001-8001-000000000110', NOW(), NOW()),
  ('e5000001-0001-4001-8001-000000000030', 'Chattogram Port Bay Terminal (CCT)', 11200, 4800, 'ONGOING', '2000000000030', '2021-08-01', 'b2000001-0001-4001-8001-000000000004', NOW(), NOW()),
  ('e5000001-0001-4001-8001-000000000031', 'National Data Centre (Tier-4 Sovereign)', 5400, 2100, 'ONGOING', '2000000000031', '2023-01-01', 'b2000001-0001-4001-8001-000000000001', NOW(), NOW()),
  ('e5000001-0001-4001-8001-000000000032', 'Smart City Dhaka North (DNCC)', 6200, 3900, 'ONGOING', '2000000000032', '2022-06-01', 'b2000001-0001-4001-8001-000000000001', NOW(), NOW()),
  ('e5000001-0001-4001-8001-000000000033', 'Flood Early Warning System (BWDB)', 2800, 2650, 'ONGOING', '2000000000033', '2020-05-01', 'b2000001-0001-4001-8001-000000000002', NOW(), NOW()),
  ('e5000001-0001-4001-8001-000000000034', 'Coastal Embankment Improvement (CEIP-1)', 8900, 7200, 'ONGOING', '2000000000034', '2019-11-01', 'b2000001-0001-4001-8001-000000000138', NOW(), NOW()),
  ('e5000001-0001-4001-8001-000000000035', 'National Social Security Digitization', 3100, 2800, 'ONGOING', '2000000000035', '2021-07-01', 'b2000001-0001-4001-8001-000000000001', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, budget_spent = EXCLUDED.budget_spent, status = EXCLUDED.status, updated_at = NOW();

INSERT INTO red_flag_alerts (id, flag_type, severity, ai_explanation, project_id, created_at)
VALUES
  ('f6000001-0001-4001-8001-000000000011', 'DELAY', 4, 'Dhaka-Ashulia Expressway land acquisition 14 months behind schedule', 'e5000001-0001-4001-8001-000000000021', NOW() - INTERVAL '11 days'),
  ('f6000001-0001-4001-8001-000000000012', 'BUDGET_OVERRUN', 3, 'Railway bridge piling cost 9% above revised estimate', 'e5000001-0001-4001-8001-000000000022', NOW() - INTERVAL '12 days'),
  ('f6000001-0001-4001-8001-000000000013', 'QUALITY', 3, 'Airport runway asphalt test batch below spec — Sylhet expansion', 'e5000001-0001-4001-8001-000000000023', NOW() - INTERVAL '13 days'),
  ('f6000001-0001-4001-8001-000000000014', 'DELAY', 5, 'National Data Centre civil works delayed — vendor mobilization gap', 'e5000001-0001-4001-8001-000000000031', NOW() - INTERVAL '14 days'),
  ('f6000001-0001-4001-8001-000000000015', 'CORRUPTION_RISK', 4, 'Coastal embankment tender — single-bidder concentration flagged', 'e5000001-0001-4001-8001-000000000034', NOW() - INTERVAL '15 days')
ON CONFLICT (id) DO UPDATE SET ai_explanation = EXCLUDED.ai_explanation, severity = EXCLUDED.severity;

-- Extra duty-holders under current BNP mandate only (no Awami League)
-- Primary roster lives in 03-representatives-real.sql; keep these upserts aligned.
INSERT INTO representatives (id, name, nid, role, party, tenure_start, tenure_end, admin_unit_id, created_at, updated_at)
VALUES
  ('d4000001-0001-4001-8001-000000000021', 'Salahuddin Ahmed (Home Affairs)', '1000000000021', 'MINISTER', 'BNP', '2026-02-15', NULL, 'b2000001-0001-4001-8001-000000000154', NOW(), NOW()),
  ('d4000001-0001-4001-8001-000000000022', 'Barrister Mahbub Uddin Khokon (Chief Whip)', '1000000000022', 'MP', 'BNP', '2026-02-15', NULL, 'b2000001-0001-4001-8001-000000000159', NOW(), NOW()),
  ('d4000001-0001-4001-8001-000000000023', 'Md. Habibur Rahman (DC, Cox''s Bazar)', '1000000000023', 'DC', 'BCS (Admin)', '2023-08-01', NULL, 'b2000001-0001-4001-8001-000000000145', NOW(), NOW()),
  ('d4000001-0001-4001-8001-000000000024', 'Dr. Khondaker Mosharraf Hossain (Health)', '1000000000024', 'MINISTER', 'BNP', '2026-02-15', NULL, 'b2000001-0001-4001-8001-000000000001', NOW(), NOW())
ON CONFLICT (nid) DO UPDATE SET
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  party = EXCLUDED.party,
  tenure_start = EXCLUDED.tenure_start,
  tenure_end = NULL,
  updated_at = NOW();
