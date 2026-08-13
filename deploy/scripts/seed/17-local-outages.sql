-- P1 sample service outages for local entities
-- Depends on: 11-local-entities.sql

INSERT INTO local_service_outages (
  id, kind, status, title, title_bn, detail, detail_bn, severity, affected_count,
  lat, lng, started_at, eta_restore_at, ward_id, entity_id, created_at, updated_at
) VALUES
(
  'f1000001-0001-4001-8001-000000000001',
  'POWER', 'ACTIVE',
  'Feeder trip near Kalurghat approach',
  'কালুরঘাট অ্যাপ্রোচে ফিডার ট্রিপ',
  'Reported 11kV feeder interruption; crews dispatched.',
  '১১ কেভি ফিডার বিঘ্ন — ক্রু মোতায়েন।',
  4, 1200, 22.391, 91.881,
  NOW() - INTERVAL '3 hours', NOW() + INTERVAL '2 hours',
  'cc000001-0001-4001-8001-000000000001',
  'c8000001-0001-4001-8001-000000000008',
  NOW(), NOW()
),
(
  'f1000001-0001-4001-8001-000000000002',
  'DRAINAGE', 'WATCH',
  'Waterlogging watch — Chandgaon market lane',
  'জলাবদ্ধতা নজর — চান্দগাঁও বাজার লেন',
  'Pump standby after overnight rain.',
  'রাতের বৃষ্টির পর পাম্প স্ট্যান্ডবাই।',
  3, 400, 22.37, 91.83,
  NOW() - INTERVAL '6 hours', NOW() + INTERVAL '5 hours',
  'cc000001-0001-4001-8001-000000000002',
  'c8000001-0001-4001-8001-000000000008',
  NOW(), NOW()
),
(
  'f1000001-0001-4001-8001-000000000003',
  'WATER', 'ACTIVE',
  'Low pressure — Bakalia ward cluster',
  'নিম্ন চাপ — বাকলিয়া ওয়ার্ড ক্লাস্টার',
  'Valve maintenance affecting morning supply.',
  'ভালভ রক্ষণাবেক্ষণে সকালের সরবরাহ প্রভাবিত।',
  3, 800, 22.34, 91.84,
  NOW() - INTERVAL '90 minutes', NOW() + INTERVAL '4 hours',
  'cc000001-0001-4001-8001-000000000004',
  'c8000001-0001-4001-8001-000000000009',
  NOW(), NOW()
),
(
  'f1000001-0001-4001-8001-000000000004',
  'ROAD', 'ACTIVE',
  'Pothole cluster — Halishahar main',
  'গর্ত ক্লাস্টার — হালিশহর মেইন',
  'Emergency fill scheduled tonight.',
  'জরুরি ভরাট আজ রাতে।',
  2, 250, 22.35, 91.78,
  NOW() - INTERVAL '8 hours', NOW() + INTERVAL '12 hours',
  'cc000001-0001-4001-8001-000000000008',
  'c8000001-0001-4001-8001-000000000010',
  NOW(), NOW()
),
(
  'f1000001-0001-4001-8001-000000000005',
  'POWER', 'ACTIVE',
  'Streetlight dark zone — CCC Ward cluster',
  'স্ট্রিটলাইট অন্ধকার জোন — সিসিসি ওয়ার্ড',
  'Contractor ticket opened; 18 poles dark.',
  'ঠিকাদার টিকিট খোলা; ১৮টি খুঁটি অন্ধকার।',
  3, 600, 22.34, 91.81,
  NOW() - INTERVAL '1 day', NOW() + INTERVAL '1 day',
  NULL,
  'c9000001-0001-4001-8001-000000000001',
  NOW(), NOW()
),
(
  'f1000001-0001-4001-8001-000000000006',
  'WATER', 'WATCH',
  'Pipeline pressure watch — COCC town hall',
  'পাইপলাইন চাপ নজর — সিওসিসি টাউন হল',
  'Night flushing window planned.',
  'রাতের ফ্লাশিং উইন্ডো পরিকল্পিত।',
  2, 350, 23.46, 91.18,
  NOW() - INTERVAL '4 hours', NOW() + INTERVAL '8 hours',
  NULL,
  'c9000001-0001-4001-8001-000000000002',
  NOW(), NOW()
)
ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status,
  title = EXCLUDED.title,
  title_bn = EXCLUDED.title_bn,
  severity = EXCLUDED.severity,
  affected_count = EXCLUDED.affected_count,
  updated_at = NOW();
