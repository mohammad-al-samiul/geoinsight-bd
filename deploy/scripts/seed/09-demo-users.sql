-- Demo RBAC users (password: ChangeMe@123 for all)

INSERT INTO users (id, email, password_hash, role, is_active, admin_unit_id, created_at, updated_at)
VALUES
  (gen_random_uuid(), 'minister@geoinsight.gov.bd', '$2b$12$VshTVUC3IBQ8rdl7JioofOGEezxO5yV9bYJGeEr0R1qYYql9ujVnW', 'MINISTER', true, 'a1000001-0001-4001-8001-000000000001', NOW(), NOW()),
  (gen_random_uuid(), 'dc.dhaka@geoinsight.gov.bd', '$2b$12$VshTVUC3IBQ8rdl7JioofOGEezxO5yV9bYJGeEr0R1qYYql9ujVnW', 'DC', true, 'b2000001-0001-4001-8001-000000000001', NOW(), NOW()),
  (gen_random_uuid(), 'dc.chattogram@geoinsight.gov.bd', '$2b$12$VshTVUC3IBQ8rdl7JioofOGEezxO5yV9bYJGeEr0R1qYYql9ujVnW', 'DC', true, 'b2000001-0001-4001-8001-000000000004', NOW(), NOW()),
  (gen_random_uuid(), 'dc.khulna@geoinsight.gov.bd', '$2b$12$VshTVUC3IBQ8rdl7JioofOGEezxO5yV9bYJGeEr0R1qYYql9ujVnW', 'DC', true, 'b2000001-0001-4001-8001-000000000159', NOW(), NOW()),
  (gen_random_uuid(), 'union.savar@geoinsight.gov.bd', '$2b$12$VshTVUC3IBQ8rdl7JioofOGEezxO5yV9bYJGeEr0R1qYYql9ujVnW', 'UNION_CHAIRMAN', true, 'f8000001-0001-4001-8001-000000001149', NOW(), NOW())
ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role, admin_unit_id = EXCLUDED.admin_unit_id, updated_at = NOW();
