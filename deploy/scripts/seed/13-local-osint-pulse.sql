-- P2 seed: curated OSINT, influencers, polling centres
-- Depends on: 11-local-entities.sql

INSERT INTO local_osint_hits (
  id, title, title_bn, summary, source_name, source_url, channel,
  matched_keyword, sentiment, propaganda_flag, propaganda_note, published_at,
  ward_id, entity_id, created_at, updated_at
) VALUES
  (
    'e2000001-0001-4001-8001-000000000001',
    'Kalurghat approach congestion after rain',
    'বৃষ্টির পর কালুরঘাট অ্যাপ্রোচে যানজট',
    'Local pages report hour-long queues near BSCIC gate.',
    'CTG Local Desk', 'https://example.com/ctg8-kalurghat', 'NEWS',
    'কালুরঘাট', 'NEGATIVE', false, NULL, NOW() - INTERVAL '6 hours',
    'cc000001-0001-4001-8001-000000000001',
    'c8000001-0001-4001-8001-000000000008',
    NOW(), NOW()
  ),
  (
    'e2000001-0001-4001-8001-000000000002',
    'Rumour: bridge collapse scheduled tonight (FALSE)',
    'গুজব: আজ রাতে সেতু ভাঙবে (মিথ্যা)',
    'Viral Facebook claim with no official source — propaganda flag.',
    'FB Public Group', 'https://example.com/fake-bridge', 'FACEBOOK',
    'kalurghat', 'NEGATIVE', true, 'Unverified collapse rumour', NOW() - INTERVAL '3 hours',
    'cc000001-0001-4001-8001-000000000002',
    'c8000001-0001-4001-8001-000000000008',
    NOW(), NOW()
  ),
  (
    'e2000001-0001-4001-8001-000000000003',
    'Panchlaish youth clean-up drive praised',
    'পঞ্চলাইশ যুব পরিচ্ছন্নতা অভিযানের প্রশংসা',
    'Positive local coverage of volunteer cleanup.',
    'Ctg Metro', 'https://example.com/panchlaish-clean', 'NEWS',
    'পঞ্চলাইশ', 'POSITIVE', false, NULL, NOW() - INTERVAL '1 day',
    'cc000001-0001-4001-8001-000000000003',
    'c8000001-0001-4001-8001-000000000008',
    NOW(), NOW()
  ),
  (
    'e2000001-0001-4001-8001-000000000011',
    'Khatunganj traders demand night security',
    'খাতুনগঞ্জ ব্যবসায়ীদের রাতের নিরাপত্তা দাবি',
    'Market association statement after theft cluster.',
    'Port City News', 'https://example.com/khatunganj', 'NEWS',
    'খাতুনগঞ্জ', 'NEGATIVE', false, NULL, NOW() - INTERVAL '8 hours',
    'cc000001-0001-4001-8001-000000000004',
    'c8000001-0001-4001-8001-000000000009',
    NOW(), NOW()
  ),
  (
    'e2000001-0001-4001-8001-000000000021',
    'Hill-cutting alert near Pahartali',
    'পাহাড়তলীতে পাহাড় কাটার সতর্কতা',
    'Drone stills shared by civic page; field verification pending.',
    'Civic Watch CTG', 'https://example.com/hillcut', 'SOCIAL',
    'পাহাড় কাটা', 'NEGATIVE', false, NULL, NOW() - INTERVAL '5 hours',
    'cc000001-0001-4001-8001-000000000008',
    'c8000001-0001-4001-8001-000000000010',
    NOW(), NOW()
  ),
  (
    'e2000001-0001-4001-8001-000000000031',
    'CCC canal dredging milestone — Ward 5',
    'সিসিসি খাল ড্রেজিং মাইলফলক — ওয়ার্ড ৫',
    'Mayor office briefing on monsoon readiness.',
    'CCC Press', 'https://example.com/ccc-canal', 'NEWS',
    'ড্রেজিং', 'POSITIVE', false, NULL, NOW() - INTERVAL '12 hours',
    'ca000001-0001-4001-8001-000000000005',
    'c9000001-0001-4001-8001-000000000001',
    NOW(), NOW()
  ),
  (
    'e2000001-0001-4001-8001-000000000032',
    'Fake tax waiver circular circulating',
    'ভুয়া ট্যাক্স মওকুফ সার্কুলার ছড়াচ্ছে',
    'Lookalike PDF shared in WhatsApp groups — flagged.',
    'FB Page', 'https://example.com/fake-tax', 'FACEBOOK',
    'ccc', 'NEGATIVE', true, 'Forged holding-tax waiver claim', NOW() - INTERVAL '2 hours',
    NULL,
    'c9000001-0001-4001-8001-000000000001',
    NOW(), NOW()
  ),
  (
    'e2000001-0001-4001-8001-000000000041',
    'Dharmasagar litter crackdown update',
    'ধর্মসাগর ময়লা ফেলা রোধ অভিযান',
    'COCC ward volunteers posted before/after photos.',
    'Cumilla Times', 'https://example.com/dighi', 'NEWS',
    'ধর্মসাগর', 'POSITIVE', false, NULL, NOW() - INTERVAL '9 hours',
    'cb000001-0001-4001-8001-000000000001',
    'c9000001-0001-4001-8001-000000000002',
    NOW(), NOW()
  )
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  title_bn = EXCLUDED.title_bn,
  summary = EXCLUDED.summary,
  sentiment = EXCLUDED.sentiment,
  propaganda_flag = EXCLUDED.propaganda_flag,
  propaganda_note = EXCLUDED.propaganda_note,
  updated_at = NOW();

INSERT INTO local_influencers (
  id, name, name_bn, role_type, phone, organization, influence_score, notes,
  is_active, ward_id, entity_id, created_at, updated_at
) VALUES
  (
    'e3000001-0001-4001-8001-000000000001',
    'Faridul Alam', 'ফরিদুল আলম', 'COMMUNITY_LEADER', '01711000001',
    'Boalkhali Civic Forum', 86, 'Bridge traffic liaison',
    true, 'cc000001-0001-4001-8001-000000000001',
    'c8000001-0001-4001-8001-000000000008', NOW(), NOW()
  ),
  (
    'e3000001-0001-4001-8001-000000000002',
    'Sharmin Akter', 'শারমিন আক্তার', 'YOUTH_ORGANIZER', '01711000002',
    'Panchlaish Youth Wing', 78, 'Cleanup & voter awareness',
    true, 'cc000001-0001-4001-8001-000000000003',
    'c8000001-0001-4001-8001-000000000008', NOW(), NOW()
  ),
  (
    'e3000001-0001-4001-8001-000000000003',
    'Haji Nurul Islam', 'হাজি নূরুল ইসলাম', 'RELIGIOUS_LEADER', '01711000003',
    'Chandgaon Central Mosque', 81, NULL,
    true, 'cc000001-0001-4001-8001-000000000002',
    'c8000001-0001-4001-8001-000000000008', NOW(), NOW()
  ),
  (
    'e3000001-0001-4001-8001-000000000011',
    'Rashed Traders', 'রাশেদ ট্রেডার্স', 'BUSINESS_LEADER', '01712000011',
    'Khatunganj Association', 90, 'Market security contact',
    true, 'cc000001-0001-4001-8001-000000000004',
    'c8000001-0001-4001-8001-000000000009', NOW(), NOW()
  ),
  (
    'e3000001-0001-4001-8001-000000000012',
    'Mita Chowdhury', 'মিতা চৌধুরী', 'VOLUNTEER', '01712000012',
    'CRB Heritage Watch', 74, NULL,
    true, 'cc000001-0001-4001-8001-000000000006',
    'c8000001-0001-4001-8001-000000000009', NOW(), NOW()
  ),
  (
    'e3000001-0001-4001-8001-000000000021',
    'Kamrul Port Worker', 'কামরুল পোর্ট ওয়ার্কার', 'INFLUENCER', '01713000021',
    'Dock Labour Forum', 83, 'EPZ / port corridor pulse',
    true, 'cc000001-0001-4001-8001-000000000007',
    'c8000001-0001-4001-8001-000000000010', NOW(), NOW()
  ),
  (
    'e3000001-0001-4001-8001-000000000031',
    'Ward 5 Captain', 'ওয়ার্ড ৫ ক্যাপ্টেন', 'COMMUNITY_LEADER', '01714000031',
    'CCC Ward Committee', 88, NULL,
    true, 'ca000001-0001-4001-8001-000000000005',
    'c9000001-0001-4001-8001-000000000001', NOW(), NOW()
  ),
  (
    'e3000001-0001-4001-8001-000000000032',
    'Nila Volunteer', 'নিলা স্বেচ্ছাসেবী', 'VOLUNTEER', '01714000032',
    'Cleansing Spotters', 71, 'Pothole photo tips',
    true, 'ca000001-0001-4001-8001-000000000001',
    'c9000001-0001-4001-8001-000000000001', NOW(), NOW()
  ),
  (
    'e3000001-0001-4001-8001-000000000041',
    'Dighi Guardian', 'দীঘি গার্ডিয়ান', 'COMMUNITY_LEADER', '01715000041',
    'Dharmasagar Society', 85, NULL,
    true, 'cb000001-0001-4001-8001-000000000001',
    'c9000001-0001-4001-8001-000000000002', NOW(), NOW()
  ),
  (
    'e3000001-0001-4001-8001-000000000042',
    'Kandirpar Hawkers Union', 'কান্দিরপাড় হকার ইউনিয়ন', 'BUSINESS_LEADER', '01715000042',
    'Town Hall Zone', 79, 'Relocation liaison',
    true, 'cb000001-0001-4001-8001-000000000003',
    'c9000001-0001-4001-8001-000000000002', NOW(), NOW()
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  influence_score = EXCLUDED.influence_score,
  is_active = true,
  updated_at = NOW();

INSERT INTO local_polling_centers (
  id, name, name_bn, code, registered_voters, new_voters, lat, lng, address,
  ward_id, entity_id, created_at, updated_at
) VALUES
  (
    'e4000001-0001-4001-8001-000000000001',
    'Boalkhali Govt High School', 'বোয়ালখালী সরকারি উচ্চ বিদ্যালয়', 'CTG8-PC-01',
    4200, 310, 22.378, 91.92, 'Boalkhali sadar',
    'cc000001-0001-4001-8001-000000000001',
    'c8000001-0001-4001-8001-000000000008', NOW(), NOW()
  ),
  (
    'e4000001-0001-4001-8001-000000000002',
    'Chandgaon Ideal School', 'চান্দগাঁও আইডিয়াল স্কুল', 'CTG8-PC-02',
    5100, 420, 22.39, 91.87, 'Chandgaon R/A',
    'cc000001-0001-4001-8001-000000000002',
    'c8000001-0001-4001-8001-000000000008', NOW(), NOW()
  ),
  (
    'e4000001-0001-4001-8001-000000000003',
    'Panchlaish Community Centre', 'পঞ্চলাইশ কমিউনিটি সেন্টার', 'CTG8-PC-03',
    3800, 260, 22.37, 91.83, 'Panchlaish Block B',
    'cc000001-0001-4001-8001-000000000003',
    'c8000001-0001-4001-8001-000000000008', NOW(), NOW()
  ),
  (
    'e4000001-0001-4001-8001-000000000011',
    'Kotwali Municipal School', 'কোতোয়ালী পৌর বিদ্যালয়', 'CTG9-PC-01',
    6100, 540, 22.341, 91.834, 'Kotwali',
    'cc000001-0001-4001-8001-000000000004',
    'c8000001-0001-4001-8001-000000000009', NOW(), NOW()
  ),
  (
    'e4000001-0001-4001-8001-000000000021',
    'Pahartali Railway School', 'পাহাড়তলী রেলওয়ে স্কুল', 'CTG10-PC-01',
    4700, 390, 22.36, 91.79, 'Pahartali',
    'cc000001-0001-4001-8001-000000000008',
    'c8000001-0001-4001-8001-000000000010', NOW(), NOW()
  ),
  (
    'e4000001-0001-4001-8001-000000000031',
    'CCC Ward 1 Centre', 'সিসিসি ওয়ার্ড ১ কেন্দ্র', 'CCC-PC-01',
    7200, 610, 22.33, 91.82, 'Agrabad area',
    'ca000001-0001-4001-8001-000000000001',
    'c9000001-0001-4001-8001-000000000001', NOW(), NOW()
  ),
  (
    'e4000001-0001-4001-8001-000000000032',
    'CCC Ward 5 Centre', 'সিসিসি ওয়ার্ড ৫ কেন্দ্র', 'CCC-PC-05',
    6900, 480, 22.34, 91.83, 'Ward 5',
    'ca000001-0001-4001-8001-000000000005',
    'c9000001-0001-4001-8001-000000000001', NOW(), NOW()
  ),
  (
    'e4000001-0001-4001-8001-000000000041',
    'Dharmasagar Academy', 'ধর্মসাগর একাডেমি', 'COCC-PC-01',
    5500, 370, 23.461, 91.181, 'Dharmasagar',
    'cb000001-0001-4001-8001-000000000001',
    'c9000001-0001-4001-8001-000000000002', NOW(), NOW()
  ),
  (
    'e4000001-0001-4001-8001-000000000042',
    'Town Hall Polling', 'টাউন হল পোলিং', 'COCC-PC-03',
    4800, 410, 23.468, 91.178, 'Kandirpar',
    'cb000001-0001-4001-8001-000000000003',
    'c9000001-0001-4001-8001-000000000002', NOW(), NOW()
  )
ON CONFLICT (id) DO UPDATE SET
  registered_voters = EXCLUDED.registered_voters,
  new_voters = EXCLUDED.new_voters,
  updated_at = NOW();
