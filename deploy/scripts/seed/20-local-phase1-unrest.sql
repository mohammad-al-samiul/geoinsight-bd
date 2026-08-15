-- Phase 1: local protest articles (geo-filtered onto mayor/MP desks)
-- + one overdue-ETA outage so the heatmap KPI is visible.
-- Depends on: 11-local-entities.sql, 16-national-realtime-feeds.sql, 17-local-outages.sql

SET client_encoding TO 'UTF8';

INSERT INTO external_articles (
  id, source_type, source_name, title, summary, url, published_at, district, division,
  sentiment_category, sentiment_score, language, fetched_at
)
VALUES
  -- CCC / Agrabad — fuel protest (last 3h)
  ('a1000001-0001-4001-8001-000000000011', 'RSS_NEWSPAPER', 'Prothom Alo',
   'আগ্রাবাদে ডিজেল সংকটে নাগরিক বিক্ষোভ, পাম্প ঘেরাও',
   'চট্টগ্রাম সিটি কর্পোরেশনের আগ্রাবাদ এলাকায় জ্বালানি ঘাটতি নিয়ে বিক্ষোভ; পুলিশ লাইন নিয়ন্ত্রণ করছে।',
   'https://geoinsight.local/seed/news/ctg-agrabad-diesel-protest',
   NOW() - INTERVAL '3 hours', 'Chattogram', 'Chattogram', 'Grievance', 0.78, 'bn', NOW() - INTERVAL '2 hours'),

  -- CTG-8 / Kalurghat — labour protest (last 5h)
  ('a1000001-0001-4001-8001-000000000012', 'RSS_NEWSPAPER', 'The Daily Star',
   'কালুরঘাট বিসিকে শ্রমিক আন্দোলন, মজুরি বকেয়া দাবি',
   'Kalurghat BSCIC workers staged a demonstration over unpaid wages; traffic slowed near the bridge approach.',
   'https://geoinsight.local/seed/news/ctg-kalurghat-labour-protest',
   NOW() - INTERVAL '5 hours', 'Chattogram', 'Chattogram', 'Grievance', 0.74, 'en', NOW() - INTERVAL '4 hours'),

  -- CCC canals — waterlogging protest (last 8h)
  ('a1000001-0001-4001-8001-000000000013', 'RSS_NEWSPAPER', 'Samakal',
   'চট্টগ্রাম সিটিতে খাল জলাবদ্ধতায় নাগরিক বিক্ষোভ',
   'ওয়ার্ডবাসী ড্রেজিং বিলম্বের প্রতিবাদে মিছিল করেছে; পানি নিষ্কাশন দাবি।',
   'https://geoinsight.local/seed/news/ccc-canal-waterlog-protest',
   NOW() - INTERVAL '8 hours', 'Chattogram', 'Chattogram', 'Grievance', 0.70, 'bn', NOW() - INTERVAL '7 hours'),

  -- Chattogram load-shedding protest (2 days ago — 7d window)
  ('a1000001-0001-4001-8001-000000000014', 'GOOGLE_NEWS', 'bdnews24',
   'চট্টগ্রামে লোডশেডিং নিয়ে মিছিল, বিদ্যুৎ দামে ক্ষোভ',
   'সন্ধ্যায় দীর্ঘ বিদ্যুৎ বিভ্রাটের প্রতিবাদে আন্দোলন; পিডিবি কার্যালয়ের সামনে সমাবেশ।',
   'https://geoinsight.local/seed/news/ctg-loadshedding-march',
   NOW() - INTERVAL '2 days', 'Chattogram', 'Chattogram', 'Grievance', 0.66, 'bn', NOW() - INTERVAL '2 days'),

  -- Older Chattogram transport strike (6 days — 7d baseline)
  ('a1000001-0001-4001-8001-000000000015', 'RSS_NEWSPAPER', 'Ittefaq',
   'চট্টগ্রাম বন্দরে পরিবহন ধর্মঘট, যানজট',
   'ট্রাক মালিক সমিতির সীমিত ধর্মঘট; কর্ণফুলী করিডোরে যানজট।',
   'https://geoinsight.local/seed/news/ctg-port-transport-strike',
   NOW() - INTERVAL '6 days', 'Chattogram', 'Chattogram', 'Grievance', 0.58, 'bn', NOW() - INTERVAL '6 days'),

  -- COCC / Kandirpar — student hartal call (last 4h)
  ('a1000001-0001-4001-8001-000000000016', 'RSS_NEWSPAPER', 'Kaler Kantho',
   'কুমিল্লা কান্দিরপাড়ে ছাত্র সমাবেশ, হরতালের ডাক',
   'কলেজ শিক্ষার্থীরা পরীক্ষা সময়সূচি নিয়ে আন্দোলন; টাউন হল এলাকায় মিছিল।',
   'https://geoinsight.local/seed/news/cocc-kandirpar-student-hartal',
   NOW() - INTERVAL '4 hours', 'Cumilla', 'Chattogram', 'Grievance', 0.72, 'bn', NOW() - INTERVAL '3 hours'),

  -- COCC / Dharmasagar — water protest (3 days)
  ('a1000001-0001-4001-8001-000000000017', 'RSS_NEWSPAPER', 'Jugantor',
   'কুমিল্লা ধর্মসাগরে পানি নিষ্কাশন আন্দোলন',
   'রানিদীঘি–ধর্মসাগর এলাকায় জলাবদ্ধতা নিয়ে নাগরিক বিক্ষোভ।',
   'https://geoinsight.local/seed/news/cocc-dharmasagar-drain-protest',
   NOW() - INTERVAL '3 days', 'Cumilla', 'Chattogram', 'Grievance', 0.61, 'bn', NOW() - INTERVAL '3 days')
ON CONFLICT (url) DO UPDATE SET
  title = EXCLUDED.title,
  summary = EXCLUDED.summary,
  sentiment_category = EXCLUDED.sentiment_category,
  sentiment_score = EXCLUDED.sentiment_score,
  division = EXCLUDED.division,
  district = EXCLUDED.district,
  published_at = EXCLUDED.published_at,
  fetched_at = EXCLUDED.fetched_at;

-- Overdue restore ETA — CCC Ward 12 (Agrabad cluster)
INSERT INTO local_service_outages (
  id, kind, source, status, title, title_bn, detail, detail_bn, severity, affected_count,
  lat, lng, started_at, eta_restore_at, ward_id, entity_id, created_at, updated_at
) VALUES (
  'f1000001-0001-4001-8001-000000000015',
  'POWER', 'OFFICIAL', 'ACTIVE',
  'Restore ETA missed — Agrabad feeder',
  'পুনরুদ্ধার সময় পেরিয়েছে — আগ্রাবাদ ফিডার',
  'Crew still on site; published ETA has slipped.',
  'ক্রু মাঠে আছে; ঘোষিত সময় পেরিয়ে গেছে।',
  4, 1600, 22.328, 91.812,
  NOW() - INTERVAL '10 hours', NOW() - INTERVAL '90 minutes',
  'ca000001-0001-4001-8001-000000000012',
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
  eta_restore_at = EXCLUDED.eta_restore_at,
  updated_at = NOW();
