-- P2 Local DSS: entity ADP projects, visit plans, pulse calendar events
-- Depends on: 11-local-entities.sql, 13-local-osint-pulse.sql

INSERT INTO projects (
  id, title, budget_allocated, budget_spent, status, contractor_nid, start_date,
  admin_unit_id, created_at, updated_at
) VALUES
(
  'e5100001-0001-4001-8001-000000000001',
  'CTG-8 Kalurghat approach resurfacing (ADP)',
  48.5, 19.2, 'ONGOING', '2000000009101', '2025-11-01',
  'c8000001-0001-4001-8001-000000000008', NOW(), NOW()
),
(
  'e5100001-0001-4001-8001-000000000002',
  'CTG-8 Drain rehabilitation package',
  22.0, 6.4, 'ONGOING', '2000000009102', '2026-01-15',
  'c8000001-0001-4001-8001-000000000008', NOW(), NOW()
),
(
  'e5100001-0001-4001-8001-000000000003',
  'CCC solid-waste transfer station upgrade',
  95.0, 41.0, 'ONGOING', '2000000009103', '2025-08-01',
  'c9000001-0001-4001-8001-000000000001', NOW(), NOW()
),
(
  'e5100001-0001-4001-8001-000000000004',
  'CCC ward streetlight LED retrofit',
  18.5, 17.9, 'COMPLETED', '2000000009104', '2024-06-01',
  'c9000001-0001-4001-8001-000000000001', NOW(), NOW()
),
(
  'e5100001-0001-4001-8001-000000000005',
  'COCC heritage facade lighting (Phase-1)',
  12.0, 3.1, 'PLANNED', '2000000009105', '2026-03-01',
  'c9000001-0001-4001-8001-000000000002', NOW(), NOW()
),
(
  'e5100001-0001-4001-8001-000000000006',
  'CTG-9 Khatunganj fire lane clearance',
  9.8, 2.2, 'STALLED', '2000000009106', '2025-09-01',
  'c8000001-0001-4001-8001-000000000009', NOW(), NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO local_visit_plans (
  id, title, title_bn, reason, status, scheduled_at, notes, priority,
  ward_id, entity_id, created_by_id, created_at, updated_at
) VALUES
(
  'e6100001-0001-4001-8001-000000000001',
  'WPI recovery walk — low-score ward',
  'নিম্ন WPI ওয়ার্ড ফিল্ড ওয়াক',
  'WPI_DROP', 'PLANNED', NOW() + INTERVAL '1 day',
  'Meet councillor + check open SLA items', 78,
  'cc000001-0001-4001-8001-000000000001',
  'c8000001-0001-4001-8001-000000000008',
  NULL, NOW(), NOW()
),
(
  'e6100001-0001-4001-8001-000000000002',
  'Red-alert site inspection',
  'রেড অ্যালার্ট সাইট পরিদর্শন',
  'RED_ALERT', 'PLANNED', NOW() + INTERVAL '6 hours',
  'Photo proof + assign field officer', 96,
  'cc000001-0001-4001-8001-000000000002',
  'c8000001-0001-4001-8001-000000000008',
  NULL, NOW(), NOW()
),
(
  'e6100001-0001-4001-8001-000000000003',
  'CCC drainage pump station check',
  'সিসিসি ড্রেনেজ পাম্প স্টেশন চেক',
  'OUTAGE', 'PLANNED', NOW() + INTERVAL '2 days',
  NULL, 70,
  'ca000001-0001-4001-8001-000000000001',
  'c9000001-0001-4001-8001-000000000001',
  NULL, NOW(), NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO local_pulse_events (
  id, kind, title, title_bn, detail, starts_at, ends_at, location_label, done,
  influencer_id, ward_id, entity_id, created_by_id, created_at, updated_at
) VALUES
(
  'e7100001-0001-4001-8001-000000000001',
  'MEETING',
  'Boalkhali civic forum sync',
  'বোয়ালখালী সিভিক ফোরাম সিঙ্ক',
  'Align on approach-road messaging',
  NOW() + INTERVAL '1 day', NOW() + INTERVAL '1 day 2 hours',
  'Boalkhali Union Parishad', false,
  'e3000001-0001-4001-8001-000000000001',
  'cc000001-0001-4001-8001-000000000001',
  'c8000001-0001-4001-8001-000000000008',
  NULL, NOW(), NOW()
),
(
  'e7100001-0001-4001-8001-000000000002',
  'OUTREACH',
  'Youth cleanup drive brief',
  'যুব ক্লিনআপ ড্রাইভ ব্রিফ',
  NULL,
  NOW() + INTERVAL '3 days', NULL,
  'Panchlaish Community Centre', false,
  'e3000001-0001-4001-8001-000000000002',
  'cc000001-0001-4001-8001-000000000003',
  'c8000001-0001-4001-8001-000000000008',
  NULL, NOW(), NOW()
),
(
  'e7100001-0001-4001-8001-000000000003',
  'FOLLOW_UP',
  'Market association security follow-up',
  'বাজার অ্যাসোসিয়েশন সিকিউরিটি ফলো-আপ',
  'After Khatunganj fire-lane stall',
  NOW() + INTERVAL '2 days', NULL,
  'Khatunganj Association Hall', false,
  'e3000001-0001-4001-8001-000000000011',
  'cc000001-0001-4001-8001-000000000004',
  'c8000001-0001-4001-8001-000000000009',
  NULL, NOW(), NOW()
)
ON CONFLICT (id) DO NOTHING;
