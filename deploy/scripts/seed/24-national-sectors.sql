-- National education / health / employment snapshots for all 64 districts.
-- Demo / seed — not a live EMIS, DGHS, or BBS labour feed.
-- Depends on: 01-admin-all-districts.sql

INSERT INTO national_sector_snapshots (
  id, sector, status, source, metrics, severity, observed_at, admin_unit_id, created_at, updated_at
)
SELECT
  (
    substr(md5(d.id::text || 'EDUCATION'), 1, 8) || '-' ||
    substr(md5(d.id::text || 'EDUCATION'), 9, 4) || '-4' ||
    substr(md5(d.id::text || 'EDUCATION'), 14, 3) || '-a' ||
    substr(md5(d.id::text || 'EDUCATION'), 18, 3) || '-' ||
    substr(md5(d.id::text || 'EDUCATION'), 21, 12)
  )::uuid,
  'EDUCATION',
  CASE
    WHEN (GREATEST(0, 88 - att) * 1.1 + drop_pct * 3.2 + gap * 8) >= 52 THEN 'ALERT'
    WHEN (GREATEST(0, 88 - att) * 1.1 + drop_pct * 3.2 + gap * 8) >= 28 THEN 'WATCH'
    ELSE 'OK'
  END::"LocalSiteStatus",
  'OFFICIAL',
  jsonb_build_object(
    'attendancePct', att,
    'dropoutPct', drop_pct,
    'teacherGap', gap,
    'enrollment', 18000 + (h % 70000)
  ),
  CASE
    WHEN (GREATEST(0, 88 - att) * 1.1 + drop_pct * 3.2 + gap * 8) >= 52 THEN 5
    WHEN (GREATEST(0, 88 - att) * 1.1 + drop_pct * 3.2 + gap * 8) >= 28 THEN 3
    ELSE 2
  END,
  NOW() - ((h % 36) || ' hours')::interval,
  d.id,
  NOW(),
  NOW()
FROM admin_units d
JOIN admin_units p ON p.id = d.parent_id
CROSS JOIN LATERAL (
  SELECT mod(abs(hashtext(d.id::text || 'EDUCATION')::bigint), 1000000)::int AS h
) hx
CROSS JOIN LATERAL (
  SELECT
    GREATEST(74, LEAST(94,
      82 + (hx.h % 12)
      - CASE p.code WHEN '70' THEN 8 WHEN '90' THEN 6 WHEN '60' THEN 5 ELSE 0 END
    )) AS att,
    GREATEST(3, LEAST(16,
      4 + (hx.h % 5)
      + CASE p.code WHEN '70' THEN 7 WHEN '90' THEN 6 WHEN '60' THEN 4 ELSE 0 END
    )) AS drop_pct,
    GREATEST(0, LEAST(6,
      (hx.h % 2)
      + CASE p.code WHEN '60' THEN 4 WHEN '70' THEN 3 WHEN '90' THEN 2 ELSE 0 END
    )) AS gap
) m
WHERE d.type = 'DISTRICT'
ON CONFLICT (admin_unit_id, sector) DO UPDATE SET
  status = EXCLUDED.status,
  metrics = EXCLUDED.metrics,
  severity = EXCLUDED.severity,
  observed_at = EXCLUDED.observed_at,
  updated_at = NOW();

INSERT INTO national_sector_snapshots (
  id, sector, status, source, metrics, severity, observed_at, admin_unit_id, created_at, updated_at
)
SELECT
  (
    substr(md5(d.id::text || 'HEALTH'), 1, 8) || '-' ||
    substr(md5(d.id::text || 'HEALTH'), 9, 4) || '-4' ||
    substr(md5(d.id::text || 'HEALTH'), 14, 3) || '-a' ||
    substr(md5(d.id::text || 'HEALTH'), 18, 3) || '-' ||
    substr(md5(d.id::text || 'HEALTH'), 21, 12)
  )::uuid,
  'HEALTH',
  CASE
    WHEN (dengue * 4.5 + GREATEST(0, occ - 80) * 1.4 + CASE WHEN stock THEN 22 ELSE 0 END + GREATEST(0, 5 - ors) * 4) >= 48 THEN 'ALERT'
    WHEN (dengue * 4.5 + GREATEST(0, occ - 80) * 1.4 + CASE WHEN stock THEN 22 ELSE 0 END + GREATEST(0, 5 - ors) * 4) >= 26 THEN 'WATCH'
    ELSE 'OK'
  END::"LocalSiteStatus",
  'OFFICIAL',
  jsonb_build_object(
    'dengueCases7d', dengue,
    'occupancyPct', occ,
    'stockout', stock,
    'orsStockDays', ors
  ),
  CASE
    WHEN (dengue * 4.5 + GREATEST(0, occ - 80) * 1.4 + CASE WHEN stock THEN 22 ELSE 0 END + GREATEST(0, 5 - ors) * 4) >= 48 THEN 5
    WHEN (dengue * 4.5 + GREATEST(0, occ - 80) * 1.4 + CASE WHEN stock THEN 22 ELSE 0 END + GREATEST(0, 5 - ors) * 4) >= 26 THEN 3
    ELSE 2
  END,
  NOW() - ((h % 30) || ' hours')::interval,
  d.id,
  NOW(),
  NOW()
FROM admin_units d
JOIN admin_units p ON p.id = d.parent_id
CROSS JOIN LATERAL (
  SELECT mod(abs(hashtext(d.id::text || 'HEALTH')::bigint), 1000000)::int AS h
) hx
CROSS JOIN LATERAL (
  SELECT
    GREATEST(0, LEAST(16,
      (hx.h % 4)
      + CASE p.code WHEN '30' THEN 7 WHEN '20' THEN 5 WHEN '40' THEN 4 ELSE 0 END
    )) AS dengue,
    GREATEST(62, LEAST(94,
      72 + (hx.h % 12)
      + CASE p.code WHEN '30' THEN 8 WHEN '20' THEN 4 ELSE 0 END
    )) AS occ,
    ((hx.h % 13) = 0) OR (p.code IN ('80', '40') AND (hx.h % 6) = 0) AS stock,
    GREATEST(3, LEAST(14, 7 + (hx.h % 7) - CASE WHEN p.code IN ('80', '40') THEN 3 ELSE 0 END)) AS ors
) m
WHERE d.type = 'DISTRICT'
ON CONFLICT (admin_unit_id, sector) DO UPDATE SET
  status = EXCLUDED.status,
  metrics = EXCLUDED.metrics,
  severity = EXCLUDED.severity,
  observed_at = EXCLUDED.observed_at,
  updated_at = NOW();

INSERT INTO national_sector_snapshots (
  id, sector, status, source, metrics, severity, observed_at, admin_unit_id, created_at, updated_at
)
SELECT
  (
    substr(md5(d.id::text || 'EMPLOYMENT'), 1, 8) || '-' ||
    substr(md5(d.id::text || 'EMPLOYMENT'), 9, 4) || '-4' ||
    substr(md5(d.id::text || 'EMPLOYMENT'), 14, 3) || '-a' ||
    substr(md5(d.id::text || 'EMPLOYMENT'), 18, 3) || '-' ||
    substr(md5(d.id::text || 'EMPLOYMENT'), 21, 12)
  )::uuid,
  'EMPLOYMENT',
  CASE
    WHEN (unemp * 2.2 + youth * 0.8 + CASE WHEN fair THEN 16 ELSE 0 END + GREATEST(0, 20 - vac) * 1.2) >= 46 THEN 'ALERT'
    WHEN (unemp * 2.2 + youth * 0.8 + CASE WHEN fair THEN 16 ELSE 0 END + GREATEST(0, 20 - vac) * 1.2) >= 26 THEN 'WATCH'
    ELSE 'OK'
  END::"LocalSiteStatus",
  'OFFICIAL',
  jsonb_build_object(
    'unemploymentPct', unemp,
    'youthUnempPct', youth,
    'vacanciesListed', vac,
    'trainingSeats', train,
    'jobFairGap', fair
  ),
  CASE
    WHEN (unemp * 2.2 + youth * 0.8 + CASE WHEN fair THEN 16 ELSE 0 END + GREATEST(0, 20 - vac) * 1.2) >= 46 THEN 5
    WHEN (unemp * 2.2 + youth * 0.8 + CASE WHEN fair THEN 16 ELSE 0 END + GREATEST(0, 20 - vac) * 1.2) >= 26 THEN 3
    ELSE 2
  END,
  NOW() - ((h % 42) || ' hours')::interval,
  d.id,
  NOW(),
  NOW()
FROM admin_units d
JOIN admin_units p ON p.id = d.parent_id
CROSS JOIN LATERAL (
  SELECT mod(abs(hashtext(d.id::text || 'EMPLOYMENT')::bigint), 1000000)::int AS h
) hx
CROSS JOIN LATERAL (
  SELECT
    GREATEST(5, LEAST(20,
      6 + (hx.h % 4)
      + CASE p.code WHEN '70' THEN 7 WHEN '90' THEN 6 WHEN '80' THEN 5 WHEN '60' THEN 2 ELSE 0 END
    )) AS unemp,
    GREATEST(10, LEAST(28,
      12 + (hx.h % 6)
      + CASE p.code WHEN '70' THEN 8 WHEN '90' THEN 6 ELSE 0 END
    )) AS youth,
    GREATEST(8, LEAST(80,
      32 + (hx.h % 36)
      - CASE p.code WHEN '70' THEN 18 WHEN '90' THEN 14 WHEN '80' THEN 12 ELSE 0 END
    )) AS vac,
    GREATEST(30, LEAST(240,
      80 + (hx.h % 120)
      - CASE p.code WHEN '70' THEN 40 WHEN '90' THEN 25 ELSE 0 END
    )) AS train,
    ((hx.h % 9) = 0) OR (p.code IN ('70', '90', '80') AND (hx.h % 4) = 0) AS fair
) m
WHERE d.type = 'DISTRICT'
ON CONFLICT (admin_unit_id, sector) DO UPDATE SET
  status = EXCLUDED.status,
  metrics = EXCLUDED.metrics,
  severity = EXCLUDED.severity,
  observed_at = EXCLUDED.observed_at,
  updated_at = NOW();
