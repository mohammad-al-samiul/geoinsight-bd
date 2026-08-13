-- National PMO realtime feeds: chart series + intel articles/signals (idempotent)

-- 1) Dashboard completion trend (12 months) — durable chart source
INSERT INTO metric_time_series (id, module, series_key, period_key, label, value, meta, recorded_at, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'dashboard',
  'completion',
  to_char(d.month_start, 'YYYY-MM'),
  to_char(d.month_start, 'Mon'),
  ROUND((74 + g.n * 1.35 + (random() * 2.5))::numeric, 1),
  jsonb_build_object('source', 'seed'),
  d.month_start + INTERVAL '14 days',
  NOW(),
  NOW()
FROM generate_series(0, 11) AS g(n)
CROSS JOIN LATERAL (
  SELECT date_trunc('month', NOW() - ((11 - g.n) || ' months')::interval) AS month_start
) d
ON CONFLICT (module, series_key, period_key) DO UPDATE SET
  value = EXCLUDED.value,
  label = EXCLUDED.label,
  recorded_at = EXCLUDED.recorded_at,
  updated_at = NOW();

-- 2) Divisional crisis chart series (crime / gas / power + YoY + forecast)
WITH divs AS (
  SELECT * FROM (VALUES
    ('dhaka', 'Dhaka', 11800, 42, 3.4),
    ('chattogram', 'Chattogram', 9200, 48, 3.8),
    ('khulna', 'Khulna', 6100, 52, 4.2),
    ('rajshahi', 'Rajshahi', 5800, 38, 5.1),
    ('sylhet', 'Sylhet', 3900, 18, 3.6),
    ('barishal', 'Barishal', 3200, 58, 4.8),
    ('rangpur', 'Rangpur', 4400, 68, 5.6),
    ('mymensingh', 'Mymensingh', 3300, 36, 4.1)
  ) AS t(slug, name, crime, gas, power)
),
yoy AS (
  SELECT * FROM (VALUES
    (2024, 0.82, 0.88, 0.85),
    (2025, 0.93, 0.95, 0.94),
    (2026, 1.00, 1.00, 1.00)
  ) AS t(yr, crime_f, gas_f, power_f)
),
fc AS (
  SELECT * FROM (VALUES
    ('m0', 'Current', 1.00, 1.00),
    ('m1', 'Month +1', 1.08, 1.12),
    ('m2', 'Month +2', 1.15, 1.18)
  ) AS t(pk, label, crime_f, power_f)
)
INSERT INTO metric_time_series (id, module, series_key, period_key, label, value, meta, recorded_at, created_at, updated_at)
SELECT gen_random_uuid(), 'divisional-crisis', d.slug || ':crime', y.yr::text, y.yr::text,
       ROUND((d.crime * y.crime_f)::numeric, 1),
       jsonb_build_object('division', d.name, 'metric', 'crime'),
       make_timestamptz(y.yr, 6, 15, 12, 0, 0, 'Asia/Dhaka'), NOW(), NOW()
FROM divs d CROSS JOIN yoy y
UNION ALL
SELECT gen_random_uuid(), 'divisional-crisis', d.slug || ':gas', y.yr::text, y.yr::text,
       ROUND((d.gas * y.gas_f)::numeric, 1),
       jsonb_build_object('division', d.name, 'metric', 'gas'),
       make_timestamptz(y.yr, 6, 15, 12, 0, 0, 'Asia/Dhaka'), NOW(), NOW()
FROM divs d CROSS JOIN yoy y
UNION ALL
SELECT gen_random_uuid(), 'divisional-crisis', d.slug || ':power', y.yr::text, y.yr::text,
       ROUND((d.power * y.power_f)::numeric, 2),
       jsonb_build_object('division', d.name, 'metric', 'power'),
       make_timestamptz(y.yr, 6, 15, 12, 0, 0, 'Asia/Dhaka'), NOW(), NOW()
FROM divs d CROSS JOIN yoy y
UNION ALL
SELECT gen_random_uuid(), 'divisional-crisis', d.slug || ':crime-fc', f.pk, f.label,
       ROUND((d.crime * f.crime_f)::numeric, 1),
       jsonb_build_object('division', d.name, 'metric', 'crime-forecast'),
       NOW() + ((CASE f.pk WHEN 'm0' THEN 0 WHEN 'm1' THEN 30 ELSE 60 END) || ' days')::interval,
       NOW(), NOW()
FROM divs d CROSS JOIN fc f
UNION ALL
SELECT gen_random_uuid(), 'divisional-crisis', d.slug || ':power-fc', f.pk, f.label,
       ROUND((d.power * f.power_f)::numeric, 2),
       jsonb_build_object('division', d.name, 'metric', 'power-forecast'),
       NOW() + ((CASE f.pk WHEN 'm0' THEN 0 WHEN 'm1' THEN 30 ELSE 60 END) || ' days')::interval,
       NOW(), NOW()
FROM divs d CROSS JOIN fc f
ON CONFLICT (module, series_key, period_key) DO UPDATE SET
  value = EXCLUDED.value,
  label = EXCLUDED.label,
  meta = EXCLUDED.meta,
  recorded_at = EXCLUDED.recorded_at,
  updated_at = NOW();

-- 3) External articles (outlook / unrest / crisis pulse)
INSERT INTO external_articles (
  id, source_type, source_name, title, summary, url, published_at, district, division,
  sentiment_category, sentiment_score, language, fetched_at
)
VALUES
  ('a1000001-0001-4001-8001-000000000001', 'RSS_NEWSPAPER', 'The Daily Star',
   'Dhaka transport strike raises political temperature ahead of reform talks',
   'Opposition groups signal street pressure as interim reforms stall.',
   'https://geoinsight.local/seed/news/dhaka-transport-strike',
   NOW() - INTERVAL '6 hours', 'Dhaka', 'Dhaka', 'Grievance', 0.72, 'en', NOW() - INTERVAL '5 hours'),
  ('a1000001-0001-4001-8001-000000000002', 'RSS_NEWSPAPER', 'Prothom Alo',
   'চট্টগ্রাম বন্দরে জ্বালানি সরবরাহে চাপ, ট্রাক সারি',
   'শিল্প ও বন্দর করিডোরে ডিজেল ঘাটতির খবর।',
   'https://geoinsight.local/seed/news/ctg-fuel-pressure',
   NOW() - INTERVAL '9 hours', 'Chattogram', 'Chattogram', 'Grievance', 0.68, 'bn', NOW() - INTERVAL '8 hours'),
  ('a1000001-0001-4001-8001-000000000003', 'GOOGLE_NEWS', 'Business Standard',
   'Remittances stabilize reserves while inflation remains sticky',
   'Analysts see mixed economic outlook for the next two quarters.',
   'https://geoinsight.local/seed/news/reserves-inflation',
   NOW() - INTERVAL '14 hours', NULL, 'Dhaka', 'Neutral', 0.12, 'en', NOW() - INTERVAL '12 hours'),
  ('a1000001-0001-4001-8001-000000000004', 'RSS_NEWSPAPER', 'Ittefaq',
   'রংপুরে লোডশেডিং নিয়ে নাগরিক ক্ষোভ',
   'গ্রামাঞ্চলে দীর্ঘ বিদ্যুৎ বিভ্রাটের অভিযোগ।',
   'https://geoinsight.local/seed/news/rangpur-loadshedding',
   NOW() - INTERVAL '4 hours', 'Rangpur', 'Rangpur', 'Grievance', 0.61, 'bn', NOW() - INTERVAL '3 hours'),
  ('a1000001-0001-4001-8001-000000000005', 'RSS_NEWSPAPER', 'Samakal',
   'খুলনা উপকূলে লবণাক্ততা ও পানি সংকট বাড়ছে',
   'স্থানীয় প্রশাসন জরুরি সরবরাহের কথা জানিয়েছে।',
   'https://geoinsight.local/seed/news/khulna-salinity',
   NOW() - INTERVAL '18 hours', 'Satkhira', 'Khulna', 'Demand', 0.44, 'bn', NOW() - INTERVAL '16 hours'),
  ('a1000001-0001-4001-8001-000000000006', 'GOOGLE_NEWS', 'bdnews24',
   'Election roadmap debate intensifies in capital',
   'Political parties differ on timeline and reform sequencing.',
   'https://geoinsight.local/seed/news/election-roadmap',
   NOW() - INTERVAL '22 hours', 'Dhaka', 'Dhaka', 'Neutral', 0.20, 'en', NOW() - INTERVAL '20 hours'),
  ('a1000001-0001-4001-8001-000000000007', 'RSS_NEWSPAPER', 'Jugantor',
   'সিলেটে সীমান্ত এলাকায় নিরাপত্তা টহল বাড়ানো',
   'স্থানীয় পুলিশ সতর্কতা জারি করেছে।',
   'https://geoinsight.local/seed/news/sylhet-border-patrol',
   NOW() - INTERVAL '11 hours', 'Sylhet', 'Sylhet', 'Neutral', 0.08, 'bn', NOW() - INTERVAL '10 hours'),
  ('a1000001-0001-4001-8001-000000000008', 'RSS_NEWSPAPER', 'Kaler Kantho',
   'ময়মনসিংহে শিল্প গ্যাস চাপ কমেছে — কারখানা মালিকদের দাবি',
   'ভালুকা শিল্পাঞ্চলে উৎপাদন ব্যাহত হওয়ার অভিযোগ।',
   'https://geoinsight.local/seed/news/mymensingh-gas',
   NOW() - INTERVAL '7 hours', 'Mymensingh', 'Mymensingh', 'Grievance', 0.57, 'bn', NOW() - INTERVAL '6 hours')
ON CONFLICT (url) DO UPDATE SET
  title = EXCLUDED.title,
  summary = EXCLUDED.summary,
  sentiment_category = EXCLUDED.sentiment_category,
  sentiment_score = EXCLUDED.sentiment_score,
  division = EXCLUDED.division,
  district = EXCLUDED.district,
  fetched_at = EXCLUDED.fetched_at;

-- 4) Live signals for national overview / crisis pulse
INSERT INTO live_signals (
  id, signal_type, title, body, url, source_name, district, division,
  severity, flag_type, sentiment_category, published_at, created_at
)
VALUES
  ('b2000001-0001-4001-8001-000000000001', 'ALERT',
   'Dhaka gas pressure drop — Tongi industrial belt',
   'Live ops report: CNG/industrial pressure below threshold for 3+ hours.',
   'https://geoinsight.local/seed/signal/dhaka-gas-tongi',
   'Ops Desk', 'Gazipur', 'Dhaka', 5, 'DELAY', 'Grievance', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours'),
  ('b2000001-0001-4001-8001-000000000002', 'ALERT',
   'Chattogram port diesel rationing',
   'Truck queues reported near Agrabad depot.',
   'https://geoinsight.local/seed/signal/ctg-diesel',
   'Port Desk', 'Chattogram', 'Chattogram', 4, 'BUDGET_OVERRUN', 'Grievance', NOW() - INTERVAL '5 hours', NOW() - INTERVAL '5 hours'),
  ('b2000001-0001-4001-8001-000000000003', 'PROJECT',
   'Flood early-warning stations online in Sylhet haor belt',
   'BWDB telemetry nodes reporting healthy heartbeat.',
   'https://geoinsight.local/seed/signal/sylhet-flood-ew',
   'BWDB Feed', 'Sunamganj', 'Sylhet', 2, NULL, 'Neutral', NOW() - INTERVAL '8 hours', NOW() - INTERVAL '8 hours'),
  ('b2000001-0001-4001-8001-000000000004', 'POLICY',
   'Cabinet briefing on energy contingency stock',
   'PMO reviewing 7-day diesel buffer for coastal divisions.',
   'https://geoinsight.local/seed/signal/energy-contingency',
   'Cabinet Note', 'Dhaka', 'Dhaka', 3, NULL, 'Neutral', NOW() - INTERVAL '12 hours', NOW() - INTERVAL '12 hours'),
  ('b2000001-0001-4001-8001-000000000005', 'ALERT',
   'Rangpur rural feeder outages spike overnight',
   'Char belt feeders dark for extended windows.',
   'https://geoinsight.local/seed/signal/rangpur-feeder',
   'PDB Desk', 'Kurigram', 'Rangpur', 4, 'QUALITY', 'Grievance', NOW() - INTERVAL '3 hours', NOW() - INTERVAL '3 hours'),
  ('b2000001-0001-4001-8001-000000000006', 'REPRESENTATIVE',
   'DC Khulna convenes salinity response meeting',
   'District control room coordinating tanker water for Satkhira belt.',
   'https://geoinsight.local/seed/signal/khulna-dc-meeting',
   'District Desk', 'Satkhira', 'Khulna', 2, NULL, 'Demand', NOW() - INTERVAL '10 hours', NOW() - INTERVAL '10 hours')
ON CONFLICT (url) DO UPDATE SET
  title = EXCLUDED.title,
  body = EXCLUDED.body,
  severity = EXCLUDED.severity,
  division = EXCLUDED.division,
  district = EXCLUDED.district,
  created_at = EXCLUDED.created_at;

-- 5) Narrative Shield seed signals
INSERT INTO narrative_signals (
  id, fingerprint, title, title_bn, body, source_url, source_name, source_platform,
  speaker_name, organization, district, division, threat_level, category, status,
  confidence_score, fact_check_status, authenticity_score, published_at, fetched_at, created_at, updated_at
)
VALUES
  ('c3000001-0001-4001-8001-000000000001', 'seed-ns-001-dhaka-incitement',
   'Viral claim: security forces ordered city-wide crackdown tonight',
   'ভাইরাল দাবি: আজ রাতে নগরজুড়ে কঠোর অভিযানের নির্দেশ',
   'Unverified social post circulating with edited clips; no official order found.',
   'https://geoinsight.local/seed/narrative/crackdown-claim',
   'Open Web Monitor', 'Google News',
   NULL, 'Unknown Page Cluster', 'Dhaka', 'Dhaka', 'HIGH', 'ANTI_GOVT_INCITEMENT', 'ACTIVE',
   0.81, 'LIKELY_DISINFO', 0.22, NOW() - INTERVAL '5 hours', NOW() - INTERVAL '4 hours', NOW(), NOW()),
  ('c3000001-0001-4001-8001-000000000002', 'seed-ns-002-economy-disinfo',
   'False claim: foreign reserves collapsed overnight',
   'মিথ্যা দাবি: এক রাতে বৈদেশিক মুদ্রার রিজার্ভ ভেঙে পড়েছে',
   'Macro indicators do not support overnight collapse narrative.',
   'https://geoinsight.local/seed/narrative/reserves-collapse',
   'Fact Watch', 'Google News',
   NULL, 'Forward Network', NULL, 'Dhaka', 'CRITICAL', 'ECONOMIC_DISINFO', 'ACTIVE',
   0.88, 'LIKELY_DISINFO', 0.15, NOW() - INTERVAL '9 hours', NOW() - INTERVAL '8 hours', NOW(), NOW()),
  ('c3000001-0001-4001-8001-000000000003', 'seed-ns-003-electoral',
   'Manipulated ballot video attributed to Cumilla center',
   'কুমিল্লার কেন্দ্র বলে চালানো সম্পাদিত ব্যালট ভিডিও',
   'Geolocation and metadata mismatch; flagged for review.',
   'https://geoinsight.local/seed/narrative/ballot-video',
   'Election Watch', 'Google News',
   NULL, 'Anonymous Channel', 'Cumilla', 'Chattogram', 'MEDIUM', 'ELECTORAL_MANIPULATION', 'ACTIVE',
   0.74, 'NEEDS_REVIEW', 0.35, NOW() - INTERVAL '15 hours', NOW() - INTERVAL '14 hours', NOW(), NOW()),
  ('c3000001-0001-4001-8001-000000000004', 'seed-ns-004-unrest',
   'Coordinated rumor of nationwide shutdown tomorrow',
   'আগামীকাল সারাদেশে অচলাবস্থার গুজব',
   'No verified call from recognized political platform.',
   'https://geoinsight.local/seed/narrative/shutdown-rumor',
   'OSINT Desk', 'Google News',
   NULL, 'Multi-account Swarm', 'Dhaka', 'Dhaka', 'HIGH', 'SOCIAL_UNREST', 'ACTIVE',
   0.79, 'NEEDS_REVIEW', 0.28, NOW() - INTERVAL '3 hours', NOW() - INTERVAL '2 hours', NOW(), NOW())
ON CONFLICT (fingerprint) DO UPDATE SET
  title = EXCLUDED.title,
  title_bn = EXCLUDED.title_bn,
  body = EXCLUDED.body,
  threat_level = EXCLUDED.threat_level,
  category = EXCLUDED.category,
  status = EXCLUDED.status,
  confidence_score = EXCLUDED.confidence_score,
  fact_check_status = EXCLUDED.fact_check_status,
  authenticity_score = EXCLUDED.authenticity_score,
  fetched_at = EXCLUDED.fetched_at,
  updated_at = NOW();

-- 6) Weather observations (division stress for crisis pulse)
INSERT INTO weather_observations (
  id, division, district, name_bn, lat, lng, temp_c, humidity_pct, precipitation_mm,
  wind_speed_kmh, weather_code, weather_label, weather_label_bn,
  flood_risk, cyclone_risk, heat_stress, population_at_risk, source, recorded_at, created_at
)
SELECT v.id, v.division, v.district, v.name_bn, v.lat, v.lng, v.temp_c, v.humidity_pct, v.precipitation_mm,
       v.wind_speed_kmh, v.weather_code, v.weather_label, v.weather_label_bn,
       v.flood_risk, v.cyclone_risk, v.heat_stress, v.population_at_risk, 'seed', NOW() - INTERVAL '1 hour', NOW()
FROM (VALUES
  ('d4000001-0001-4001-8001-000000000001'::uuid, 'Dhaka', 'Dhaka', 'ঢাকা', 23.81, 90.41, 33.2, 78, 2.4, 14.0, 61, 'Rain showers', 'বৃষ্টির সম্ভাবনা', 2, 1, 3, 120000),
  ('d4000001-0001-4001-8001-000000000002'::uuid, 'Chattogram', 'Chattogram', 'চট্টগ্রাম', 22.36, 91.78, 31.5, 82, 6.1, 22.0, 63, 'Heavy rain', 'ভারী বৃষ্টি', 3, 2, 2, 95000),
  ('d4000001-0001-4001-8001-000000000003'::uuid, 'Khulna', 'Satkhira', 'সাতক্ষীরা', 22.72, 89.07, 30.8, 85, 8.4, 18.5, 65, 'Thunderstorm', 'বজ্রবৃষ্টি', 4, 3, 2, 78000),
  ('d4000001-0001-4001-8001-000000000004'::uuid, 'Rangpur', 'Kurigram', 'কুড়িগ্রাম', 25.81, 89.65, 29.4, 80, 4.2, 12.0, 61, 'Rain', 'বৃষ্টি', 3, 1, 1, 54000),
  ('d4000001-0001-4001-8001-000000000005'::uuid, 'Sylhet', 'Sunamganj', 'সুনামগঞ্জ', 25.07, 91.40, 28.9, 88, 12.5, 16.0, 65, 'Monsoon rain', 'বর্ষা বৃষ্টি', 4, 1, 1, 62000),
  ('d4000001-0001-4001-8001-000000000006'::uuid, 'Barishal', 'Patuakhali', 'পটুয়াখালী', 22.36, 90.33, 30.1, 86, 7.8, 24.0, 63, 'Coastal rain', 'উপকূলীয় বৃষ্টি', 3, 3, 2, 41000),
  ('d4000001-0001-4001-8001-000000000007'::uuid, 'Rajshahi', 'Rajshahi', 'রাজশাহী', 24.37, 88.60, 34.6, 62, 0.2, 10.0, 1, 'Clear hot', 'গরম রোদ', 1, 0, 4, 38000),
  ('d4000001-0001-4001-8001-000000000008'::uuid, 'Mymensingh', 'Mymensingh', 'ময়মনসিংহ', 24.75, 90.41, 32.0, 74, 1.1, 11.0, 2, 'Partly cloudy', 'আংশিক মেঘলা', 2, 0, 3, 29000)
) AS v(id, division, district, name_bn, lat, lng, temp_c, humidity_pct, precipitation_mm, wind_speed_kmh, weather_code, weather_label, weather_label_bn, flood_risk, cyclone_risk, heat_stress, population_at_risk)
WHERE NOT EXISTS (
  SELECT 1 FROM weather_observations w WHERE w.id = v.id
);

-- 7) Disaster alerts for hazards module
INSERT INTO disaster_alerts (
  id, external_id, alert_type, severity, title, title_bn, description, division,
  lat, lng, population_at_risk, valid_from, valid_to, source, is_active, created_at, updated_at
)
VALUES
  ('e5000001-0001-4001-8001-000000000001', 'seed-hazard-sunamganj-flood', 'FLOOD', 4,
   'Haor flood watch — Sunamganj', 'হাওর বন্যা সতর্কতা — সুনামগঞ্জ',
   'Rising water levels in Tanguar haor catchment.', 'Sylhet',
   25.07, 91.40, 62000, NOW() - INTERVAL '6 hours', NOW() + INTERVAL '2 days', 'seed', true, NOW(), NOW()),
  ('e5000001-0001-4001-8001-000000000002', 'seed-hazard-barishal-coast', 'CYCLONE', 3,
   'Bay of Bengal coastal advisory', 'বঙ্গোপসাগর উপকূলীয় পরামর্শ',
   'Rough sea and wind advisory for fishing vessels.', 'Barishal',
   21.95, 90.15, 41000, NOW() - INTERVAL '10 hours', NOW() + INTERVAL '36 hours', 'seed', true, NOW(), NOW()),
  ('e5000001-0001-4001-8001-000000000003', 'seed-hazard-rajshahi-heat', 'HEAT', 3,
   'Rajshahi heat-stress advisory', 'রাজশাহী তাপমাত্রা সতর্কতা',
   'Afternoon heat index elevated for outdoor labor.', 'Rajshahi',
   24.37, 88.60, 38000, NOW() - INTERVAL '3 hours', NOW() + INTERVAL '18 hours', 'seed', true, NOW(), NOW())
ON CONFLICT (external_id) DO UPDATE SET
  title = EXCLUDED.title,
  title_bn = EXCLUDED.title_bn,
  description = EXCLUDED.description,
  severity = EXCLUDED.severity,
  is_active = true,
  valid_from = EXCLUDED.valid_from,
  valid_to = EXCLUDED.valid_to,
  updated_at = NOW();

-- 8) Outlook / briefing intel snapshots (cached strategic payload seed)
INSERT INTO intel_analysis_snapshots (id, kind, lang, scope_key, payload, source_count, llm_used, generated_at)
VALUES
  ('f6000001-0001-4001-8001-000000000001', 'OUTLOOK', 'en', NULL,
   '{"challenges":[{"domain":"politics","title":"Reform sequencing friction","severity":4,"summary":"Parties contest election roadmap timing.","evidence":["Election roadmap debate intensifies in capital"]},{"domain":"economy","title":"Sticky inflation vs remittance cushion","severity":3,"summary":"Reserves improve but consumer prices remain elevated.","evidence":["Remittances stabilize reserves while inflation remains sticky"]}],"direction":[{"domain":"politics","trajectory":"volatile","summary":"Street pressure episodes likely around reform milestones.","drivers":["transport strike narratives","election timeline debate"]},{"domain":"economy","trajectory":"stabilizing","summary":"External buffers strengthen; energy logistics remain a watchpoint.","drivers":["remittances","fuel corridor stress"]}],"scenarios":[{"label":"Base: managed transition","horizon":"6 months","probability_band":"base","politics":"Moderate","economy":"Moderate","watchpoints":["cabinet energy contingency","district grievance spikes"]},{"label":"Adverse: corridor disruption","horizon":"3 months","probability_band":"adverse","politics":"High","economy":"High","watchpoints":["port diesel rationing","rural feeder outages"]}],"narrative":"Seeded national outlook from curated open-source signals for PMO charts and briefings.","disclaimer":"Demo seed — replace via pipeline refresh in production.","source_count":8,"llm_used":false,"sources":[{"title":"Election roadmap debate intensifies in capital","source":"bdnews24","url":"https://geoinsight.local/seed/news/election-roadmap","domain":"politics","published_at":"2026-08-11T12:00:00Z"},{"title":"Remittances stabilize reserves while inflation remains sticky","source":"Business Standard","url":"https://geoinsight.local/seed/news/reserves-inflation","domain":"economy","published_at":"2026-08-11T18:00:00Z"}]}'::jsonb,
   8, false, NOW()),
  ('f6000001-0001-4001-8001-000000000002', 'OUTLOOK', 'bn', NULL,
   '{"challenges":[{"domain":"politics","title":"সংস্কার ক্রম নিয়ে টানাপোড়েন","severity":4,"summary":"নির্বাচন রোডম্যাপের সময় নিয়ে দলগুলোর মতভেদ।","evidence":["রাজধানীতে নির্বাচন রোডম্যাপ বিতর্ক"]},{"domain":"economy","title":"মূল্যস্ফীতি বনাম রেমিট্যান্স কুশন","severity":3,"summary":"রিজার্ভ উন্নতি হলেও ভোক্তা মূল্য উঁচু।","evidence":["রেমিট্যান্সে রিজার্ভ স্থিতিশীল"]}],"direction":[{"domain":"politics","trajectory":"অস্থির","summary":"সংস্কার মাইলস্টোনে রাস্তার চাপ বাড়তে পারে।","drivers":["পরিবহন ধর্মঘট","নির্বাচন সময়সূচি"]},{"domain":"economy","trajectory":"স্থিতিশীল","summary":"বাহ্যিক বাফার শক্তিশালী; জ্বালানি লজিস্টিকস নজরদারি যোগ্য।","drivers":["রেমিট্যান্স","জ্বালানি করিডোর"]}],"scenarios":[{"label":"ভিত্তি: নিয়ন্ত্রিত উত্তরণ","horizon":"৬ মাস","probability_band":"base","politics":"মধ্যম","economy":"মধ্যম","watchpoints":["জ্বালানি মজুদ","জেলা অভিযোগ"]},{"label":"প্রতিকূল: করিডোর ব্যাঘাত","horizon":"৩ মাস","probability_band":"adverse","politics":"উচ্চ","economy":"উচ্চ","watchpoints":["বন্দর ডিজেল","গ্রামীণ ফিডার"]}],"narrative":"পিএমও চার্ট ও ব্রিফিংয়ের জন্য সিড করা জাতীয় আউটলুক।","disclaimer":"ডেমো সিড — প্রোডাকশনে পাইপলাইন রিফ্রেশ দিয়ে প্রতিস্থাপন করুন।","source_count":8,"llm_used":false,"sources":[]}'::jsonb,
   8, false, NOW()),
  ('f6000001-0001-4001-8001-000000000003', 'BRIEFING', 'en', NULL,
   '{"headline":"National pulse: energy corridors + narrative risk","bullets":["Dhaka/Chattogram logistics stress elevated","Narrative shield: 4 active high-confidence claims","Haor flood watch active in Sylhet"],"refreshed_at":"2026-08-12T10:00:00Z"}'::jsonb,
   6, false, NOW())
ON CONFLICT (id) DO UPDATE SET
  payload = EXCLUDED.payload,
  source_count = EXCLUDED.source_count,
  generated_at = EXCLUDED.generated_at;
