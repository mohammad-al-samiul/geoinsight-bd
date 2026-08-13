-- P1 sample Instant Action complaints + baseline WPI for local entities
-- Depends on: 11-local-entities.sql

-- CTG-8 complaints
INSERT INTO citizen_complaints (
  id, title, title_bn, description, category, severity, status,
  citizen_name, citizen_phone, lat, lng, location_label,
  before_photo_url, after_photo_url, resolution_note,
  sla_deadline, is_red_alert, resolved_at, ward_id, entity_id, resolved_by_id,
  created_at, updated_at
) VALUES
  (
    'e1000001-0001-4001-8001-000000000001',
    'Drain collapse near Kalurghat approach',
    'কালুরঘাট অ্যাপ্রোচে ড্রেন ধস',
    'Citizen reported open drain after heavy rain — traffic hazard.',
    'DRAINAGE', 'CRITICAL', 'OPEN',
    'Karim Hossain', '01810000001', 22.391, 91.881, 'Kalurghat approach road',
    'https://placehold.co/640x360/1e293b/f87171/1e293b',
    NULL, NULL,
    NOW() + INTERVAL '6 hours', true, NULL,
    'cc000001-0001-4001-8001-000000000001',
    'c8000001-0001-4001-8001-000000000008',
    NULL,
    NOW() - INTERVAL '18 hours', NOW()
  ),
  (
    'e1000001-0001-4001-8001-000000000002',
    'BSCIC factory waste dumping',
    'বিসিক কারখানার বর্জ্য ফেলা',
    'Industrial effluent smell near residential lane.',
    'WASTE', 'HIGH', 'IN_PROGRESS',
    'Nasrin Akter', '01810000002', 22.385, 91.875, 'Kalurghat BSCIC gate-2',
    'https://placehold.co/640x360/1e293b/fb923c/1e293b',
    NULL, NULL,
    NOW() + INTERVAL '10 hours', true, NULL,
    'cc000001-0001-4001-8001-000000000002',
    'c8000001-0001-4001-8001-000000000008',
    NULL,
    NOW() - INTERVAL '14 hours', NOW()
  ),
  (
    'e1000001-0001-4001-8001-000000000003',
    'Streetlight outage — Panchlaish block C',
    'পঞ্চলাইশ ব্লক সি স্ট্রিটলাইট বন্ধ',
    'Three poles dark for two nights.',
    'INFRASTRUCTURE', 'MEDIUM', 'RESOLVED',
    'Rafiqul Islam', '01810000003', 22.372, 91.832, 'Panchlaish Block C',
    'https://placehold.co/640x360/1e293b/94a3b8/1e293b',
    'https://placehold.co/640x360/14532d/86efac/14532d',
    'Bulbs replaced by CCC crew; verified on site.',
    NOW() - INTERVAL '2 hours', false,
    NOW() - INTERVAL '4 hours',
    'cc000001-0001-4001-8001-000000000003',
    'c8000001-0001-4001-8001-000000000008',
    'a1000001-0001-4001-8001-000000000101',
    NOW() - INTERVAL '20 hours', NOW()
  ),
  (
    'e1000001-0001-4001-8001-000000000004',
    'Riverbank erosion complaint — Sangu edge',
    'সাঙ্গু তীর ভাঙন অভিযোগ',
    'Homestead at risk; farmer list requested.',
    'INFRASTRUCTURE', 'HIGH', 'OPEN',
    'Abdul Malek', '01810000004', 22.36, 91.9, 'Sangu riverside',
    'https://placehold.co/640x360/1e293b/f87171/1e293b',
    NULL, NULL,
    NOW() - INTERVAL '3 hours', true, NULL,
    'cc000001-0001-4001-8001-000000000001',
    'c8000001-0001-4001-8001-000000000008',
    NULL,
    NOW() - INTERVAL '30 hours', NOW()
  ),

  -- CCC complaints
  (
    'e1000001-0001-4001-8001-000000000011',
    'Pothole cluster — Agrabad feeder',
    'আগ্রাবাদ ফিডারে গর্ত',
    'Multiple potholes after monsoon; bus route disrupted.',
    'INFRASTRUCTURE', 'HIGH', 'OPEN',
    'Salma Begum', '01820000011', 22.328, 91.812, 'Agrabad CDA Avenue',
    'https://placehold.co/640x360/1e293b/fb923c/1e293b',
    NULL, NULL,
    NOW() + INTERVAL '8 hours', true, NULL,
    'ca000001-0001-4001-8001-000000000001',
    'c9000001-0001-4001-8001-000000000001',
    NULL,
    NOW() - INTERVAL '16 hours', NOW()
  ),
  (
    'e1000001-0001-4001-8001-000000000012',
    'Canal overflow warning — Ward 5',
    'ওয়ার্ড ৫ খাল উপচে পড়া',
    'Water level rising; digital twin alert follow-up.',
    'DRAINAGE', 'CRITICAL', 'IN_PROGRESS',
    'Jamal Uddin', '01820000012', 22.34, 91.83, 'CCC Ward 5 canal point',
    'https://placehold.co/640x360/1e293b/f87171/1e293b',
    NULL, NULL,
    NOW() + INTERVAL '4 hours', true, NULL,
    'ca000001-0001-4001-8001-000000000005',
    'c9000001-0001-4001-8001-000000000001',
    NULL,
    NOW() - INTERVAL '20 hours', NOW()
  ),
  (
    'e1000001-0001-4001-8001-000000000013',
    'Illegal dumping beside holding',
    'হোল্ডিং পাশে অবৈধ ময়লা',
    'Resolved within SLA with before/after evidence.',
    'WASTE', 'MEDIUM', 'RESOLVED',
    'Farhana Yasmin', '01820000013', 22.35, 91.84, 'CCC Ward 8',
    'https://placehold.co/640x360/1e293b/94a3b8/1e293b',
    'https://placehold.co/640x360/14532d/86efac/14532d',
    'Cleared by cleansing fleet; photo verified.',
    NOW() + INTERVAL '2 hours', false,
    NOW() - INTERVAL '1 hour',
    'ca000001-0001-4001-8001-000000000008',
    'c9000001-0001-4001-8001-000000000001',
    'a1000001-0001-4001-8001-000000000104',
    NOW() - INTERVAL '12 hours', NOW()
  ),

  -- COCC
  (
    'e1000001-0001-4001-8001-000000000021',
    'Dharmasagar litter hotspot',
    'ধর্মসাগরে ময়লা ফেলা',
    'Evening dumping near heritage waterbody.',
    'WASTE', 'HIGH', 'OPEN',
    'Imran Kabir', '01830000021', 23.461, 91.181, 'Dharmasagar west bank',
    'https://placehold.co/640x360/1e293b/fb923c/1e293b',
    NULL, NULL,
    NOW() + INTERVAL '12 hours', true, NULL,
    'cb000001-0001-4001-8001-000000000001',
    'c9000001-0001-4001-8001-000000000002',
    NULL,
    NOW() - INTERVAL '10 hours', NOW()
  ),
  (
    'e1000001-0001-4001-8001-000000000022',
    'Kandirpar traffic choke',
    'কান্দিরপাড় ট্রাফিক জ্যাম',
    'Hawker encroachment blocking right-turn lane.',
    'TRAFFIC', 'MEDIUM', 'IN_PROGRESS',
    'Nusrat Jahan', '01830000022', 23.468, 91.178, 'Kandirpar crossing',
    'https://placehold.co/640x360/1e293b/94a3b8/1e293b',
    NULL, NULL,
    NOW() - INTERVAL '1 hour', false, NULL,
    'cb000001-0001-4001-8001-000000000003',
    'c9000001-0001-4001-8001-000000000002',
    NULL,
    NOW() - INTERVAL '26 hours', NOW()
  )
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  title_bn = EXCLUDED.title_bn,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  severity = EXCLUDED.severity,
  status = EXCLUDED.status,
  before_photo_url = EXCLUDED.before_photo_url,
  after_photo_url = EXCLUDED.after_photo_url,
  resolution_note = EXCLUDED.resolution_note,
  sla_deadline = EXCLUDED.sla_deadline,
  is_red_alert = EXCLUDED.is_red_alert,
  resolved_at = EXCLUDED.resolved_at,
  updated_at = NOW();

-- Baseline WPI for CTG-8 focus areas (period 2026-08)
INSERT INTO ward_performance_scores (
  id, period_key, score, service_score, infra_score, resolution_score,
  open_complaints, resolved_within_sla, total_resolved, computed_at,
  ward_id, entity_id, created_at, updated_at
) VALUES
  (
    'f1000001-0001-4001-8001-000000000001', '2026-08', 72, 70, 68, 78,
    2, 1, 1, NOW(),
    'cc000001-0001-4001-8001-000000000001',
    'c8000001-0001-4001-8001-000000000008',
    NOW(), NOW()
  ),
  (
    'f1000001-0001-4001-8001-000000000002', '2026-08', 81, 82, 79, 82,
    1, 0, 0, NOW(),
    'cc000001-0001-4001-8001-000000000002',
    'c8000001-0001-4001-8001-000000000008',
    NOW(), NOW()
  ),
  (
    'f1000001-0001-4001-8001-000000000003', '2026-08', 88, 85, 84, 95,
    0, 1, 1, NOW(),
    'cc000001-0001-4001-8001-000000000003',
    'c8000001-0001-4001-8001-000000000008',
    NOW(), NOW()
  )
ON CONFLICT (ward_id, period_key) DO UPDATE SET
  score = EXCLUDED.score,
  service_score = EXCLUDED.service_score,
  infra_score = EXCLUDED.infra_score,
  resolution_score = EXCLUDED.resolution_score,
  open_complaints = EXCLUDED.open_complaints,
  resolved_within_sla = EXCLUDED.resolved_within_sla,
  total_resolved = EXCLUDED.total_resolved,
  computed_at = NOW(),
  updated_at = NOW();
