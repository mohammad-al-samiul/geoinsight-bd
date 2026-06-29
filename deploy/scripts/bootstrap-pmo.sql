UPDATE users
SET password_hash = '$2b$12$VshTVUC3IBQ8rdl7JioofOGEezxO5yV9bYJGeEr0R1qYYql9ujVnW',
    updated_at = NOW()
WHERE email = 'pmo@geoinsight.gov.bd';
