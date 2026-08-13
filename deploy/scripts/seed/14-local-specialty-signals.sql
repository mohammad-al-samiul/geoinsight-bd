-- P3 seed: role specialty signals for CTG-8/9/10 + CCC + COCC
-- Depends on: 11-local-entities.sql

INSERT INTO local_specialty_signals (
  id, module_id, title, title_bn, detail, detail_bn, status,
  metric_label, metric_label_bn, metric_value, metric_unit,
  lat, lng, recorded_at, ward_id, entity_id, created_at, updated_at
) VALUES
  -- CTG-8
  (
    'e5000001-0001-4001-8001-000000000001', 'kalurghat-bridge',
    'Peak inbound delay — Kalurghat bridge',
    'কালুরঘাট সেতুতে পিক ইনবাউন্ড বিলম্ব',
    'Average crossing time rose during evening peak.',
    'সন্ধ্যার পিকে গড় পারাপার সময় বেড়েছে।',
    'ALERT', 'Avg delay', 'গড় বিলম্ব', 18.5, 'min',
    22.391, 91.881, NOW() - INTERVAL '2 hours',
    'cc000001-0001-4001-8001-000000000001',
    'c8000001-0001-4001-8001-000000000008', NOW(), NOW()
  ),
  (
    'e5000001-0001-4001-8001-000000000002', 'kalurghat-bridge',
    'Daily crossings within band',
    'দৈনিক পারাপার সীমার মধ্যে',
    'Morning crossings stable vs 7-day mean.',
    'সকালের পারাপার ৭ দিনের গড়ের কাছাকাছি।',
    'OK', 'Crossings', 'পারাপার', 41200, 'veh/day',
    22.391, 91.881, NOW() - INTERVAL '5 hours',
    'cc000001-0001-4001-8001-000000000001',
    'c8000001-0001-4001-8001-000000000008', NOW(), NOW()
  ),
  (
    'e5000001-0001-4001-8001-000000000003', 'bscic-waste',
    'Effluent smell cluster — BSCIC gate-2',
    'বিসিক গেট-২ এ বর্জ্য গন্ধ ক্লাস্টার',
    'Three citizen reports in 6 hours; labour unrest chatter rising.',
    '৬ ঘণ্টায় তিনটি নাগরিক রিপোর্ট; শ্রমিক অসন্তোষের আলোচনা বাড়ছে।',
    'ALERT', 'Open waste tickets', 'খোলা বর্জ্য টিকিট', 4, 'count',
    22.385, 91.875, NOW() - INTERVAL '1 hour',
    'cc000001-0001-4001-8001-000000000002',
    'c8000001-0001-4001-8001-000000000008', NOW(), NOW()
  ),
  (
    'e5000001-0001-4001-8001-000000000004', 'river-erosion',
    'Sangu bank scarp advance',
    'সাঙ্গু তীর স্কার্প অগ্রগতি',
    'Geo-map update: ~12m scarp near listed farmsteads.',
    'জিও-ম্যাপ আপডেট: তালিকাভুক্ত খামারের কাছে ~১২ মি স্কার্প।',
    'WATCH', 'Scarp advance', 'স্কার্প অগ্রগতি', 12, 'm',
    22.36, 91.90, NOW() - INTERVAL '8 hours',
    'cc000001-0001-4001-8001-000000000001',
    'c8000001-0001-4001-8001-000000000008', NOW(), NOW()
  ),

  -- CTG-9
  (
    'e5000001-0001-4001-8001-000000000011', 'market-security',
    'Khatunganj night theft heatmap spike',
    'খাতুনগঞ্জ রাতের চুরি হিটম্যাপ স্পাইক',
    'Security desk flagged warehouse lane after 2 incidents.',
    '২ ঘটনার পর ওয়্যারহাউস লেইনে সিকিউরিটি ফ্ল্যাগ।',
    'ALERT', 'Incidents (24h)', 'ঘটনা (২৪ঘ)', 2, 'count',
    22.341, 91.84, NOW() - INTERVAL '3 hours',
    'cc000001-0001-4001-8001-000000000004',
    'c8000001-0001-4001-8001-000000000009', NOW(), NOW()
  ),
  (
    'e5000001-0001-4001-8001-000000000012', 'market-security',
    'Asadganj wholesale price calm',
    'আছাদগঞ্জ পাইকারি দর স্থিতিশীল',
    'Onion/rice quotes within ±3% of weekly median.',
    'পেঁয়াজ/চালের দর সাপ্তাহিক মিডিয়ানের ±৩% এর মধ্যে।',
    'OK', 'Price variance', 'দর বিচ্যুতি', 2.4, '%',
    22.34, 91.85, NOW() - INTERVAL '6 hours',
    'cc000001-0001-4001-8001-000000000005',
    'c8000001-0001-4001-8001-000000000009', NOW(), NOW()
  ),
  (
    'e5000001-0001-4001-8001-000000000013', 'health-tracker',
    'CMCH emergency wait elevated',
    'সিএমসিএইচ জরুরি বিভাগে অপেক্ষা বেশি',
    'Triage queue > 45 min reported by campus desk.',
    'ক্যাম্পাস ডেস্ক: ট্রায়াজ কিউ ৪৫ মিনিটের বেশি।',
    'WATCH', 'ER wait', 'ইআর অপেক্ষা', 52, 'min',
    22.359, 91.83, NOW() - INTERVAL '4 hours',
    'cc000001-0001-4001-8001-000000000004',
    'c8000001-0001-4001-8001-000000000009', NOW(), NOW()
  ),
  (
    'e5000001-0001-4001-8001-000000000014', 'heritage-security',
    'CRB encroachment watch — west fence',
    'সিআরবি পশ্চিম বেড়া দখল নজরদারি',
    'Photo tip of temporary stall against heritage fence.',
    'হেরিটেজ বেড়ার বিপরীতে অস্থায়ী স্টলের ছবি।',
    'IN_PROGRESS', 'Open tips', 'খোলা টিপস', 1, 'count',
    22.355, 91.822, NOW() - INTERVAL '7 hours',
    'cc000001-0001-4001-8001-000000000006',
    'c8000001-0001-4001-8001-000000000009', NOW(), NOW()
  ),

  -- CTG-10
  (
    'e5000001-0001-4001-8001-000000000021', 'hill-cutting',
    'Illegal cut scar — Lalkhan Bazar ridge',
    'লালখান বাজার রিজে অবৈধ কাটার দাগ',
    'Satellite/drone delta vs last mosaic flagged new scar.',
    'শেষ মোজাইকের তুলনায় নতুন স্কার ফ্ল্যাগ।',
    'ALERT', 'New scar area', 'নতুন স্কার এলাকা', 0.18, 'ha',
    22.365, 91.80, NOW() - INTERVAL '90 minutes',
    'cc000001-0001-4001-8001-000000000008',
    'c8000001-0001-4001-8001-000000000010', NOW(), NOW()
  ),
  (
    'e5000001-0001-4001-8001-000000000022', 'port-logistics',
    'EPZ access road slowdown',
    'ইপিজেড অ্যাক্সেস রোডে ধীরগতি',
    'Port-connecting corridor average speed dropped.',
    'পোর্ট কানেক্টিং করিডোরে গড় গতি কমেছে।',
    'WATCH', 'Avg speed', 'গড় গতি', 14, 'km/h',
    22.32, 91.79, NOW() - INTERVAL '3 hours',
    'cc000001-0001-4001-8001-000000000007',
    'c8000001-0001-4001-8001-000000000010', NOW(), NOW()
  ),
  (
    'e5000001-0001-4001-8001-000000000023', 'railway-colony',
    'Labour clinic outreach on track',
    'শ্রমিক ক্লিনিক আউটরিচ চলমান',
    'Social service camp completed 62 checkups.',
    'সামাজিক সেবা ক্যাম্পে ৬২টি চেকআপ সম্পন্ন।',
    'OK', 'Checkups', 'চেকআপ', 62, 'count',
    22.34, 91.80, NOW() - INTERVAL '1 day',
    'cc000001-0001-4001-8001-000000000009',
    'c8000001-0001-4001-8001-000000000010', NOW(), NOW()
  ),

  -- CCC
  (
    'e5000001-0001-4001-8001-000000000031', 'canal-digital-twin',
    'Ward 5 canal water-level rising',
    'ওয়ার্ড ৫ খালে পানির স্তর বাড়ছে',
    'Sensor twin threshold crossed after showers.',
    'বৃষ্টির পর সেন্সর টুইন থ্রেশহোল্ড অতিক্রম।',
    'ALERT', 'Water level', 'পানিস্তর', 1.42, 'm',
    22.34, 91.83, NOW() - INTERVAL '45 minutes',
    'ca000001-0001-4001-8001-000000000005',
    'c9000001-0001-4001-8001-000000000001', NOW(), NOW()
  ),
  (
    'e5000001-0001-4001-8001-000000000032', 'canal-digital-twin',
    'Dredging progress — canal cluster B',
    'খাল ক্লাস্টার বি ড্রেজিং অগ্রগতি',
    '36-canal programme: cluster B at 64% spoil removal.',
    '৩৬ খাল কর্মসূচি: ক্লাস্টার বি ৬৪% সম্পন্ন।',
    'IN_PROGRESS', 'Dredging done', 'ড্রেজিং সম্পন্ন', 64, '%',
    22.35, 91.84, NOW() - INTERVAL '10 hours',
    NULL,
    'c9000001-0001-4001-8001-000000000001', NOW(), NOW()
  ),
  (
    'e5000001-0001-4001-8001-000000000033', 'pothole-ai',
    'AI pothole cluster — Agrabad feeder',
    'আগ্রাবাদ ফিডারে এআই পথহোল ক্লাস্টার',
    'Cleansing-fleet camera tagged 7 high-confidence pits.',
    'পরিচ্ছন্নতা বহরের ক্যামেরা ৭টি উচ্চ-কনফিডেন্স গর্ত ট্যাগ করেছে।',
    'ALERT', 'Potholes', 'পথহোল', 7, 'count',
    22.328, 91.812, NOW() - INTERVAL '2 hours',
    'ca000001-0001-4001-8001-000000000001',
    'c9000001-0001-4001-8001-000000000001', NOW(), NOW()
  ),
  (
    'e5000001-0001-4001-8001-000000000034', 'tax-automation',
    'Holding tax liquidity healthy',
    'হোল্ডিং ট্যাক্স লিকুইডিটি স্বাস্থ্যকর',
    'Same-day settlement ratio above target.',
    'একই দিনের সেটেলমেন্ট রেশিও টার্গেটের উপরে।',
    'OK', 'Settlement ratio', 'সেটেলমেন্ট অনুপাত', 78, '%',
    NULL, NULL, NOW() - INTERVAL '4 hours',
    NULL,
    'c9000001-0001-4001-8001-000000000001', NOW(), NOW()
  ),
  (
    'e5000001-0001-4001-8001-000000000035', 'smart-streetlight',
    'Solar nodes offline — Ward 8 strip',
    'ওয়ার্ড ৮ স্ট্রিপে সোলার নোড অফলাইন',
    'Sensor status: 11 poles no heartbeat overnight.',
    'সেন্সর স্ট্যাটাস: রাতে ১১টি খুঁটিতে হার্টবিট নেই।',
    'WATCH', 'Offline poles', 'অফলাইন খুঁটি', 11, 'count',
    22.35, 91.84, NOW() - INTERVAL '6 hours',
    'ca000001-0001-4001-8001-000000000008',
    'c9000001-0001-4001-8001-000000000001', NOW(), NOW()
  ),

  -- COCC
  (
    'e5000001-0001-4001-8001-000000000041', 'dighi-preservation',
    'Dharmasagar litter hotspot evening peak',
    'ধর্মসাগরে সন্ধ্যার ময়লা ফেলার পিক',
    'Preservation patrol logged dumping near west bank.',
    'পশ্চিম তীরে ময়লা ফেলার নথিভুক্তি।',
    'ALERT', 'Dump tips', 'ডাম্প টিপস', 3, 'count',
    23.461, 91.181, NOW() - INTERVAL '2 hours',
    'cb000001-0001-4001-8001-000000000001',
    'c9000001-0001-4001-8001-000000000002', NOW(), NOW()
  ),
  (
    'e5000001-0001-4001-8001-000000000042', 'traffic-hawkers',
    'Kandirpar right-turn blocked',
    'কান্দিরপাড় রাইট-টার্ন বন্ধ',
    'Hawker encroachment delaying Town Hall zone flow.',
    'হকার দখলে টাউন হল জোনের প্রবাহ বিলম্বিত।',
    'WATCH', 'Queue length', 'কিউ দৈর্ঘ্য', 160, 'm',
    23.468, 91.178, NOW() - INTERVAL '90 minutes',
    'cb000001-0001-4001-8001-000000000003',
    'c9000001-0001-4001-8001-000000000002', NOW(), NOW()
  ),
  (
    'e5000001-0001-4001-8001-000000000043', 'ward-expansion',
    'Expanded ward road package — 42% done',
    'সংবর্ধিত ওয়ার্ড সড়ক প্যাকেজ — ৪২% সম্পন্ন',
    'Infrastructure tracker for newly joined wards.',
    'নতুন যুক্ত ওয়ার্ডের অবকাঠামো ট্র্যাকার।',
    'IN_PROGRESS', 'Works complete', 'কাজ সম্পন্ন', 42, '%',
    23.47, 91.19, NOW() - INTERVAL '1 day',
    'cb000001-0001-4001-8001-000000000005',
    'c9000001-0001-4001-8001-000000000002', NOW(), NOW()
  )
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  title_bn = EXCLUDED.title_bn,
  detail = EXCLUDED.detail,
  detail_bn = EXCLUDED.detail_bn,
  status = EXCLUDED.status,
  metric_value = EXCLUDED.metric_value,
  recorded_at = EXCLUDED.recorded_at,
  updated_at = NOW();
