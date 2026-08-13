-- P4: phones for WhatsApp/voice dry-run + sample alert delivery logs

UPDATE users SET
  phone = CASE email
    WHEN 'mp.ctg8@geoinsight.gov.bd' THEN '+8801811000008'
    WHEN 'mp.ctg9@geoinsight.gov.bd' THEN '+8801811000009'
    WHEN 'mp.ctg10@geoinsight.gov.bd' THEN '+8801811000010'
    WHEN 'mayor.ccc@geoinsight.gov.bd' THEN '+8801811000101'
    WHEN 'mayor.cocc@geoinsight.gov.bd' THEN '+8801811000102'
    ELSE phone
  END,
  updated_at = NOW()
WHERE email IN (
  'mp.ctg8@geoinsight.gov.bd',
  'mp.ctg9@geoinsight.gov.bd',
  'mp.ctg10@geoinsight.gov.bd',
  'mayor.ccc@geoinsight.gov.bd',
  'mayor.cocc@geoinsight.gov.bd'
);

INSERT INTO alert_delivery_logs (
  id, channel, status, to_address, body_preview, provider_ref, error,
  source_kind, source_id, entity_id, payload, user_id, created_at
)
VALUES
  (
    'ad000001-0001-4001-8001-000000000001',
    'WHATSAPP', 'DRY_RUN', '+8801811000008',
    'GeoInsight RED ALERT — Drain collapse CTG-8 focus area (seed)',
    'dry:seed-wa-1', NULL,
    'citizen_complaint', NULL,
    'c8000001-0001-4001-8001-000000000008',
    '{"mode":"dry_run","seed":true}'::jsonb,
    'a1000001-0001-4001-8001-000000000101',
    NOW() - INTERVAL '2 hours'
  ),
  (
    'ad000001-0001-4001-8001-000000000002',
    'VOICE', 'DRY_RUN', '+8801811000008',
    'জিওইনসাইট সতর্কতা। Drain collapse CTG-8',
    'voice-dry:seed-1', NULL,
    'citizen_complaint', NULL,
    'c8000001-0001-4001-8001-000000000008',
    '{"mode":"dry_run","seed":true}'::jsonb,
    'a1000001-0001-4001-8001-000000000101',
    NOW() - INTERVAL '2 hours'
  ),
  (
    'ad000001-0001-4001-8001-000000000003',
    'WHATSAPP', 'DRY_RUN', '+8801811000101',
    'GeoInsight RED ALERT — Waterlogging Ward-12 CCC (seed)',
    'dry:seed-wa-2', NULL,
    'manual', NULL,
    'c9000001-0001-4001-8001-000000000001',
    '{"mode":"dry_run","seed":true}'::jsonb,
    'a1000001-0001-4001-8001-000000000104',
    NOW() - INTERVAL '45 minutes'
  )
ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status,
  body_preview = EXCLUDED.body_preview,
  provider_ref = EXCLUDED.provider_ref,
  payload = EXCLUDED.payload;
