-- Repair Bengali names when seed was applied with wrong client encoding (idempotent)
UPDATE admin_units SET name_bn = 'ঢাকা' WHERE type = 'DIVISION' AND code = '30';
UPDATE admin_units SET name_bn = 'চট্টগ্রাম' WHERE type = 'DIVISION' AND code = '20';
UPDATE admin_units SET name_bn = 'খুলনা' WHERE type = 'DIVISION' AND code = '40';
UPDATE admin_units SET name_bn = 'রাজশাহী' WHERE type = 'DIVISION' AND code = '50';
UPDATE admin_units SET name_bn = 'সিলেট' WHERE type = 'DIVISION' AND code = '60';
UPDATE admin_units SET name_bn = 'রংপুর' WHERE type = 'DIVISION' AND code = '70';
UPDATE admin_units SET name_bn = 'বরিশাল' WHERE type = 'DIVISION' AND code = '80';
UPDATE admin_units SET name_bn = 'ময়মনসিংহ' WHERE type = 'DIVISION' AND code = '90';

UPDATE admin_units SET name_bn = 'ঢাকা' WHERE type = 'DISTRICT' AND code = '3026';
UPDATE admin_units SET name_bn = 'গাজীপুর' WHERE type = 'DISTRICT' AND code = '3033';
UPDATE admin_units SET name_bn = 'ফরিদপুর' WHERE type = 'DISTRICT' AND code = '3029';
UPDATE admin_units SET name_bn = 'চট্টগ্রাম' WHERE type = 'DISTRICT' AND code = '2015';
UPDATE admin_units SET name_bn = 'কুমিল্লা' WHERE type = 'DISTRICT' AND code = '2019';
