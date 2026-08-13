-- Current government duty-holders only (BNP mandate, Feb 2026–).
-- No Awami League. Same UUIDs kept for KPI FK stability where possible.

INSERT INTO representatives (id, name, nid, role, party, tenure_start, tenure_end, admin_unit_id, created_at, updated_at)
VALUES
  -- Cabinet / political leadership
  ('d4000001-0001-4001-8001-000000000025', 'Begum Khaleda Zia (Prime Minister)', '1000000000025', 'MINISTER', 'BNP', '2026-02-15', NULL, 'a1000001-0001-4001-8001-000000000001', NOW(), NOW()),
  ('d4000001-0001-4001-8001-000000000001', 'Tarique Rahman (Senior Minister)', '1000000000001', 'MINISTER', 'BNP', '2026-02-15', NULL, 'a1000001-0001-4001-8001-000000000001', NOW(), NOW()),
  ('d4000001-0001-4001-8001-000000000012', 'Amir Khasru Mahmud Chowdhury (Finance)', '1000000000012', 'MINISTER', 'BNP', '2026-02-15', NULL, 'b2000001-0001-4001-8001-000000000001', NOW(), NOW()),
  ('d4000001-0001-4001-8001-000000000021', 'Salahuddin Ahmed (Home Affairs)', '1000000000021', 'MINISTER', 'BNP', '2026-02-15', NULL, 'b2000001-0001-4001-8001-000000000154', NOW(), NOW()),
  ('d4000001-0001-4001-8001-000000000002', 'Mirza Fakhrul Islam Alamgir (Foreign Affairs)', '1000000000002', 'MINISTER', 'BNP', '2026-02-15', NULL, 'b2000001-0001-4001-8001-000000000001', NOW(), NOW()),
  ('d4000001-0001-4001-8001-000000000010', 'Nazrul Islam Khan (Road Transport)', '1000000000010', 'MINISTER', 'BNP', '2026-02-15', NULL, 'b2000001-0001-4001-8001-000000000004', NOW(), NOW()),
  ('d4000001-0001-4001-8001-000000000004', 'Dr. Abdul Moyeen Khan (Education)', '1000000000004', 'MINISTER', 'BNP', '2026-02-15', NULL, 'b2000001-0001-4001-8001-000000000004', NOW(), NOW()),
  ('d4000001-0001-4001-8001-000000000011', 'Rumeen Farhana (Law & Justice)', '1000000000011', 'MINISTER', 'BNP', '2026-02-15', NULL, 'b2000001-0001-4001-8001-000000000003', NOW(), NOW()),
  ('d4000001-0001-4001-8001-000000000014', 'Gayeshwar Chandra Roy (Local Government)', '1000000000014', 'MINISTER', 'BNP', '2026-02-15', NULL, 'b2000001-0001-4001-8001-000000000124', NOW(), NOW()),
  ('d4000001-0001-4001-8001-000000000016', 'Hafiz Uddin Ahmed (Agriculture)', '1000000000016', 'MINISTER', 'BNP', '2026-02-15', NULL, 'b2000001-0001-4001-8001-000000000135', NOW(), NOW()),
  ('d4000001-0001-4001-8001-000000000024', 'Dr. Khondaker Mosharraf Hossain (Health)', '1000000000024', 'MINISTER', 'BNP', '2026-02-15', NULL, 'b2000001-0001-4001-8001-000000000001', NOW(), NOW()),
  ('d4000001-0001-4001-8001-000000000015', 'Shahjahan Omar (Defence)', '1000000000015', 'MINISTER', 'BNP', '2026-02-15', NULL, 'b2000001-0001-4001-8001-000000000154', NOW(), NOW()),
  ('d4000001-0001-4001-8001-000000000017', 'Barrister Kayser Kamal (Information)', '1000000000017', 'MINISTER', 'BNP', '2026-02-15', NULL, 'b2000001-0001-4001-8001-000000000001', NOW(), NOW()),
  -- Parliament / whip
  ('d4000001-0001-4001-8001-000000000022', 'Barrister Mahbub Uddin Khokon (Chief Whip)', '1000000000022', 'MP', 'BNP', '2026-02-15', NULL, 'b2000001-0001-4001-8001-000000000159', NOW(), NOW()),
  -- District administration (career BCS — not party cabinet)
  ('d4000001-0001-4001-8001-000000000003', 'Dr. Ahmed Nawaz (DC, Gazipur)', '1000000000003', 'DC', 'BCS (Admin)', '2023-02-01', NULL, 'b2000001-0001-4001-8001-000000000002', NOW(), NOW()),
  ('d4000001-0001-4001-8001-000000000005', 'Dr. Shahadat Hossain (DC, Cumilla)', '1000000000005', 'DC', 'BCS (Admin)', '2022-06-15', NULL, 'b2000001-0001-4001-8001-000000000005', NOW(), NOW()),
  ('d4000001-0001-4001-8001-000000000013', 'Muhammad Imran (DC, Khulna)', '1000000000013', 'DC', 'BCS (Admin)', '2021-11-01', NULL, 'b2000001-0001-4001-8001-000000000159', NOW(), NOW()),
  ('d4000001-0001-4001-8001-000000000018', 'Md. Tofazzel Hossain (DC, Rangpur)', '1000000000018', 'DC', 'BCS (Admin)', '2020-09-01', NULL, 'b2000001-0001-4001-8001-000000000132', NOW(), NOW()),
  ('d4000001-0001-4001-8001-000000000019', 'Md. Shafiul Alam (DC, Mymensingh)', '1000000000019', 'DC', 'BCS (Admin)', '2022-01-15', NULL, 'b2000001-0001-4001-8001-000000000110', NOW(), NOW()),
  ('d4000001-0001-4001-8001-000000000023', 'Md. Habibur Rahman (DC, Cox''s Bazar)', '1000000000023', 'DC', 'BCS (Admin)', '2023-08-01', NULL, 'b2000001-0001-4001-8001-000000000145', NOW(), NOW()),
  ('d4000001-0001-4001-8001-000000000020', 'Md. Anwar Hossain (Union Chairman, Savar)', '1000000000020', 'UNION_CHAIRMAN', 'Local Govt', '2022-01-01', NULL, 'f8000001-0001-4001-8001-000000001149', NOW(), NOW())
ON CONFLICT (nid) DO UPDATE SET
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  party = EXCLUDED.party,
  tenure_start = EXCLUDED.tenure_start,
  tenure_end = NULL,
  admin_unit_id = EXCLUDED.admin_unit_id,
  updated_at = NOW();

-- Hard close: no active Awami League / prior-cabinet tenure under current mandate
UPDATE representatives
SET tenure_end = '2026-02-14', updated_at = NOW()
WHERE (
  party ILIKE '%Awami%'
  OR name ILIKE '%Hasina%'
  OR name ILIKE '%Quader%'
  OR name ILIKE '%Samanta Lal Sen%'
  OR name ILIKE '%Nurul Islam Nahid%'
  OR name ILIKE '%Shamim Osman%'
  OR name ILIKE '%Moudud Ahmed%'
)
AND (tenure_end IS NULL OR tenure_end > DATE '2026-02-14');
