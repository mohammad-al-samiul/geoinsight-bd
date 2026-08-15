-- Phase 0 demo: gas/fuel outages + new complaint categories with mixed sources
-- Depends on: 11-local-entities.sql, 17-local-outages.sql

INSERT INTO local_service_outages (
  id, kind, source, status, title, title_bn, detail, detail_bn, severity, affected_count,
  lat, lng, started_at, eta_restore_at, ward_id, entity_id, created_at, updated_at
) VALUES
(
  'f1000001-0001-4001-8001-000000000011',
  'GAS', 'OFFICIAL', 'ACTIVE',
  'Low gas pressure — CCC Ward 5 cluster',
  'গ্যাস চাপ কম — সিসিসি ওয়ার্ড ৫',
  'Titas reported feeder pressure drop; cooking hours restricted.',
  'তিতাস ফিডার চাপ কমেছে; রান্নার সময় সীমিত।',
  4, 2200, 22.340, 91.816,
  NOW() - INTERVAL '5 hours', NOW() + INTERVAL '6 hours',
  'ca000001-0001-4001-8001-000000000005',
  'c9000001-0001-4001-8001-000000000001',
  NOW(), NOW()
),
(
  'f1000001-0001-4001-8001-000000000012',
  'FUEL', 'NEWS', 'ACTIVE',
  'Octane queue — Agrabad filling station',
  'অকটেন লাইন — আগ্রাবাদ ফিলিং স্টেশন',
  'Local press: 3-hour wait; tanker ETA evening.',
  'স্থানীয় সংবাদ: ৩ ঘণ্টা লাইন; ট্যাংকার সন্ধ্যায়।',
  3, 900, 22.328, 91.812,
  NOW() - INTERVAL '2 hours', NOW() + INTERVAL '8 hours',
  'ca000001-0001-4001-8001-000000000012',
  'c9000001-0001-4001-8001-000000000001',
  NOW(), NOW()
),
(
  'f1000001-0001-4001-8001-000000000013',
  'GAS', 'CITIZEN', 'WATCH',
  'Gas smell report — Kalurghat lane',
  'গ্যাসের গন্ধ — কালুরঘাট লেন',
  'Citizen hotline; leak inspection pending.',
  'নাগরিক হটলাইন; লিকেজ পরিদর্শন বাকি।',
  5, 180, 22.391, 91.881,
  NOW() - INTERVAL '40 minutes', NOW() + INTERVAL '3 hours',
  'cc000001-0001-4001-8001-000000000001',
  'c8000001-0001-4001-8001-000000000008',
  NOW(), NOW()
),
(
  'f1000001-0001-4001-8001-000000000014',
  'POWER', 'ACADEMIC', 'WATCH',
  'Feeder overload study zone — CCC Ward 1',
  'ফিডার ওভারলোড স্টাডি জোন — সিসিসি ওয়ার্ড ১',
  'Campus paper flagged recurring evening trips on this feeder.',
  'ক্যাম্পাস পেপারে এই ফিডারে বিকেলের বারবার ট্রিপ উল্লেখ।',
  2, 400, 22.324, 91.804,
  NOW() - INTERVAL '1 day', NOW() + INTERVAL '2 days',
  'ca000001-0001-4001-8001-000000000001',
  'c9000001-0001-4001-8001-000000000001',
  NOW(), NOW()
)
ON CONFLICT (id) DO UPDATE SET
  kind = EXCLUDED.kind,
  source = EXCLUDED.source,
  status = EXCLUDED.status,
  title = EXCLUDED.title,
  title_bn = EXCLUDED.title_bn,
  severity = EXCLUDED.severity,
  affected_count = EXCLUDED.affected_count,
  lat = EXCLUDED.lat,
  lng = EXCLUDED.lng,
  updated_at = NOW();

INSERT INTO citizen_complaints (
  id, title, title_bn, description, category, source, severity, status,
  citizen_name, citizen_phone, lat, lng, location_label,
  before_photo_url, after_photo_url, resolution_note,
  sla_deadline, is_red_alert, resolved_at, ward_id, entity_id, resolved_by_id,
  created_at, updated_at
) VALUES
(
  'e1000001-0001-4001-8001-000000000031',
  'Phone snatch after dark — Ward 12',
  'সন্ধ্যার পর মোবাইল ছিনতাই — ওয়ার্ড ১২',
  'Two incidents near the filling-station queue this week.',
  'CRIME', 'CITIZEN', 'HIGH', 'OPEN',
  'Shahidul Islam', '01810000031', 22.329, 91.813, 'Agrabad station road',
  NULL, NULL, NULL,
  NOW() + INTERVAL '12 hours', true, NULL,
  'ca000001-0001-4001-8001-000000000012',
  'c9000001-0001-4001-8001-000000000001',
  NULL,
  NOW() - INTERVAL '6 hours', NOW()
),
(
  'e1000001-0001-4001-8001-000000000032',
  'Holding-tax counter extra fee',
  'হোল্ডিং ট্যাক্স কাউন্টারে অতিরিক্ত ফি',
  'Citizen alleged unofficial charge to process a mutation file.',
  'CORRUPTION', 'NEWS', 'MEDIUM', 'OPEN',
  'Anonymous', NULL, 22.341, 91.818, 'CCC zone office',
  NULL, NULL, NULL,
  NOW() + INTERVAL '20 hours', false, NULL,
  'ca000001-0001-4001-8001-000000000005',
  'c9000001-0001-4001-8001-000000000001',
  NULL,
  NOW() - INTERVAL '4 hours', NOW()
),
(
  'e1000001-0001-4001-8001-000000000033',
  'Teacher vacancy — primary school cluster',
  'শিক্ষক শূন্যপদ — প্রাথমিক স্কুল ক্লাস্টার',
  'Two classrooms combined; attendance dropping.',
  'EDUCATION', 'OFFICIAL', 'MEDIUM', 'OPEN',
  'Head teacher', '01810000033', 22.336, 91.808, 'Ward 1 primary school',
  NULL, NULL, NULL,
  NOW() + INTERVAL '36 hours', false, NULL,
  'ca000001-0001-4001-8001-000000000001',
  'c9000001-0001-4001-8001-000000000001',
  NULL,
  NOW() - INTERVAL '10 hours', NOW()
),
(
  'e1000001-0001-4001-8001-000000000034',
  'Dengue ward — clinic bed shortage',
  'ডেঙ্গু ওয়ার্ড — ক্লিনিক বেড সংকট',
  'Community clinic referred 11 cases; no beds overnight.',
  'HEALTH', 'OFFICIAL', 'HIGH', 'OPEN',
  'Ward health worker', '01810000034', 22.338, 91.814, 'Ward 5 clinic',
  NULL, NULL, NULL,
  NOW() + INTERVAL '8 hours', true, NULL,
  'ca000001-0001-4001-8001-000000000005',
  'c9000001-0001-4001-8001-000000000001',
  NULL,
  NOW() - INTERVAL '9 hours', NOW()
),
(
  'e1000001-0001-4001-8001-000000000035',
  'Youth unemployment after mill closure',
  'মিল বন্ধের পর যুব বেকারত্ব',
  'Local study: 18–25 jobless rate up in this ward cluster.',
  'UNEMPLOYMENT', 'ACADEMIC', 'MEDIUM', 'OPEN',
  NULL, NULL, 22.348, 91.820, 'Ward 5 basti lane',
  NULL, NULL, NULL,
  NOW() + INTERVAL '48 hours', false, NULL,
  'ca000001-0001-4001-8001-000000000005',
  'c9000001-0001-4001-8001-000000000001',
  NULL,
  NOW() - INTERVAL '1 day', NOW()
),
(
  'e1000001-0001-4001-8001-000000000036',
  'Evening load-shedding — cooking hours',
  'সন্ধ্যার লোডশেডিং — রান্নার সময়',
  'Three-hour gap overlapping gas low-pressure window.',
  'UTILITIES', 'CITIZEN', 'HIGH', 'OPEN',
  'Rokeya Begum', '01810000036', 22.339, 91.815, 'Ward 5 lane 4',
  NULL, NULL, NULL,
  NOW() + INTERVAL '10 hours', true, NULL,
  'ca000001-0001-4001-8001-000000000005',
  'c9000001-0001-4001-8001-000000000001',
  NULL,
  NOW() - INTERVAL '3 hours', NOW()
)
ON CONFLICT (id) DO UPDATE SET
  category = EXCLUDED.category,
  source = EXCLUDED.source,
  severity = EXCLUDED.severity,
  status = EXCLUDED.status,
  title = EXCLUDED.title,
  title_bn = EXCLUDED.title_bn,
  updated_at = NOW();
