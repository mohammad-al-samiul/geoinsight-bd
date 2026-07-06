-- Commodity price logs: indicative international trade prices (USD/MT, demo)
-- 6 months of weekly snapshots for arbitrage heatmap

INSERT INTO commodity_price_logs (commodity_code, country_code, country_name, unit_price_usd, shipping_cost_usd, tariff_rate, landed_cost_usd, source_rank, created_at)
SELECT v.commodity, v.cc, v.cn, v.price + (random() * 20 - 10), v.ship, v.tariff, (v.price + v.ship + v.price * v.tariff) + (random() * 15 - 7), v.rank,
  NOW() - INTERVAL '0 days'
FROM (VALUES
  ('RICE_BR28', 'IND', 'India', 438::numeric, 32::numeric, 0.05::numeric, 1),
  ('RICE_BR28', 'MMR', 'Myanmar', 412::numeric, 45::numeric, 0.05::numeric, 2),
  ('RICE_BR28', 'THA', 'Thailand', 455::numeric, 55::numeric, 0.05::numeric, 3),
  ('RICE_BR28', 'VNM', 'Vietnam', 448::numeric, 50::numeric, 0.05::numeric, 4),
  ('WHEAT', 'IND', 'India', 285::numeric, 28::numeric, 0.08::numeric, 5),
  ('WHEAT', 'PAK', 'Pakistan', 268::numeric, 35::numeric, 0.08::numeric, 6),
  ('WHEAT', 'RUS', 'Russia', 240::numeric, 62::numeric, 0.08::numeric, 7),
  ('WHEAT', 'UKR', 'Ukraine', 252::numeric, 58::numeric, 0.08::numeric, 8),
  ('ONION', 'IND', 'India', 395::numeric, 22::numeric, 0.1::numeric, 9),
  ('ONION', 'EGY', 'Egypt', 360::numeric, 48::numeric, 0.1::numeric, 10),
  ('ONION', 'TUR', 'Turkey', 345::numeric, 52::numeric, 0.1::numeric, 11),
  ('LENTIL_MASUR', 'IND', 'India', 535::numeric, 30::numeric, 0.05::numeric, 12),
  ('LENTIL_MASUR', 'CAN', 'Canada', 498::numeric, 65::numeric, 0.05::numeric, 13),
  ('LENTIL_MASUR', 'AUS', 'Australia', 510::numeric, 70::numeric, 0.05::numeric, 14),
  ('POTATO', 'IND', 'India', 180::numeric, 18::numeric, 0.05::numeric, 15),
  ('POTATO', 'NLD', 'Netherlands', 220::numeric, 55::numeric, 0.05::numeric, 16),
  ('SUGAR', 'IND', 'India', 520::numeric, 35::numeric, 0.15::numeric, 17),
  ('SUGAR', 'BRA', 'Brazil', 485::numeric, 72::numeric, 0.15::numeric, 18),
  ('SOYBEAN_OIL', 'ARG', 'Argentina', 890::numeric, 68::numeric, 0.12::numeric, 19),
  ('SOYBEAN_OIL', 'MYS', 'Malaysia', 920::numeric, 55::numeric, 0.12::numeric, 20),
  ('COTTON', 'IND', 'India', 1650::numeric, 40::numeric, 0.05::numeric, 21),
  ('COTTON', 'USA', 'United States', 1580::numeric, 85::numeric, 0.05::numeric, 22),
  ('FERTILIZER_Urea', 'CHN', 'China', 310::numeric, 45::numeric, 0.03::numeric, 23),
  ('FERTILIZER_Urea', 'QAT', 'Qatar', 295::numeric, 52::numeric, 0.03::numeric, 24),
  ('JUTE', 'BGD', 'Bangladesh', 680::numeric, 0::numeric, 0.0::numeric, 25)
) AS v(commodity, cc, cn, price, ship, tariff, rank)
WHERE NOT EXISTS (
  SELECT 1 FROM commodity_price_logs WHERE created_at > NOW() - INTERVAL '3 days' AND created_at < NOW() - INTERVAL '-3 days' LIMIT 1
);

INSERT INTO commodity_price_logs (commodity_code, country_code, country_name, unit_price_usd, shipping_cost_usd, tariff_rate, landed_cost_usd, source_rank, created_at)
SELECT v.commodity, v.cc, v.cn, v.price + (random() * 20 - 10), v.ship, v.tariff, (v.price + v.ship + v.price * v.tariff) + (random() * 15 - 7), v.rank,
  NOW() - INTERVAL '7 days'
FROM (VALUES
  ('RICE_BR28', 'IND', 'India', 438::numeric, 32::numeric, 0.05::numeric, 1),
  ('RICE_BR28', 'MMR', 'Myanmar', 412::numeric, 45::numeric, 0.05::numeric, 2),
  ('RICE_BR28', 'THA', 'Thailand', 455::numeric, 55::numeric, 0.05::numeric, 3),
  ('RICE_BR28', 'VNM', 'Vietnam', 448::numeric, 50::numeric, 0.05::numeric, 4),
  ('WHEAT', 'IND', 'India', 285::numeric, 28::numeric, 0.08::numeric, 5),
  ('WHEAT', 'PAK', 'Pakistan', 268::numeric, 35::numeric, 0.08::numeric, 6),
  ('WHEAT', 'RUS', 'Russia', 240::numeric, 62::numeric, 0.08::numeric, 7),
  ('WHEAT', 'UKR', 'Ukraine', 252::numeric, 58::numeric, 0.08::numeric, 8),
  ('ONION', 'IND', 'India', 395::numeric, 22::numeric, 0.1::numeric, 9),
  ('ONION', 'EGY', 'Egypt', 360::numeric, 48::numeric, 0.1::numeric, 10),
  ('ONION', 'TUR', 'Turkey', 345::numeric, 52::numeric, 0.1::numeric, 11),
  ('LENTIL_MASUR', 'IND', 'India', 535::numeric, 30::numeric, 0.05::numeric, 12),
  ('LENTIL_MASUR', 'CAN', 'Canada', 498::numeric, 65::numeric, 0.05::numeric, 13),
  ('LENTIL_MASUR', 'AUS', 'Australia', 510::numeric, 70::numeric, 0.05::numeric, 14),
  ('POTATO', 'IND', 'India', 180::numeric, 18::numeric, 0.05::numeric, 15),
  ('POTATO', 'NLD', 'Netherlands', 220::numeric, 55::numeric, 0.05::numeric, 16),
  ('SUGAR', 'IND', 'India', 520::numeric, 35::numeric, 0.15::numeric, 17),
  ('SUGAR', 'BRA', 'Brazil', 485::numeric, 72::numeric, 0.15::numeric, 18),
  ('SOYBEAN_OIL', 'ARG', 'Argentina', 890::numeric, 68::numeric, 0.12::numeric, 19),
  ('SOYBEAN_OIL', 'MYS', 'Malaysia', 920::numeric, 55::numeric, 0.12::numeric, 20),
  ('COTTON', 'IND', 'India', 1650::numeric, 40::numeric, 0.05::numeric, 21),
  ('COTTON', 'USA', 'United States', 1580::numeric, 85::numeric, 0.05::numeric, 22),
  ('FERTILIZER_Urea', 'CHN', 'China', 310::numeric, 45::numeric, 0.03::numeric, 23),
  ('FERTILIZER_Urea', 'QAT', 'Qatar', 295::numeric, 52::numeric, 0.03::numeric, 24),
  ('JUTE', 'BGD', 'Bangladesh', 680::numeric, 0::numeric, 0.0::numeric, 25)
) AS v(commodity, cc, cn, price, ship, tariff, rank)
WHERE NOT EXISTS (
  SELECT 1 FROM commodity_price_logs WHERE created_at > NOW() - INTERVAL '10 days' AND created_at < NOW() - INTERVAL '4 days' LIMIT 1
);

INSERT INTO commodity_price_logs (commodity_code, country_code, country_name, unit_price_usd, shipping_cost_usd, tariff_rate, landed_cost_usd, source_rank, created_at)
SELECT v.commodity, v.cc, v.cn, v.price + (random() * 20 - 10), v.ship, v.tariff, (v.price + v.ship + v.price * v.tariff) + (random() * 15 - 7), v.rank,
  NOW() - INTERVAL '14 days'
FROM (VALUES
  ('RICE_BR28', 'IND', 'India', 438::numeric, 32::numeric, 0.05::numeric, 1),
  ('RICE_BR28', 'MMR', 'Myanmar', 412::numeric, 45::numeric, 0.05::numeric, 2),
  ('RICE_BR28', 'THA', 'Thailand', 455::numeric, 55::numeric, 0.05::numeric, 3),
  ('RICE_BR28', 'VNM', 'Vietnam', 448::numeric, 50::numeric, 0.05::numeric, 4),
  ('WHEAT', 'IND', 'India', 285::numeric, 28::numeric, 0.08::numeric, 5),
  ('WHEAT', 'PAK', 'Pakistan', 268::numeric, 35::numeric, 0.08::numeric, 6),
  ('WHEAT', 'RUS', 'Russia', 240::numeric, 62::numeric, 0.08::numeric, 7),
  ('WHEAT', 'UKR', 'Ukraine', 252::numeric, 58::numeric, 0.08::numeric, 8),
  ('ONION', 'IND', 'India', 395::numeric, 22::numeric, 0.1::numeric, 9),
  ('ONION', 'EGY', 'Egypt', 360::numeric, 48::numeric, 0.1::numeric, 10),
  ('ONION', 'TUR', 'Turkey', 345::numeric, 52::numeric, 0.1::numeric, 11),
  ('LENTIL_MASUR', 'IND', 'India', 535::numeric, 30::numeric, 0.05::numeric, 12),
  ('LENTIL_MASUR', 'CAN', 'Canada', 498::numeric, 65::numeric, 0.05::numeric, 13),
  ('LENTIL_MASUR', 'AUS', 'Australia', 510::numeric, 70::numeric, 0.05::numeric, 14),
  ('POTATO', 'IND', 'India', 180::numeric, 18::numeric, 0.05::numeric, 15),
  ('POTATO', 'NLD', 'Netherlands', 220::numeric, 55::numeric, 0.05::numeric, 16),
  ('SUGAR', 'IND', 'India', 520::numeric, 35::numeric, 0.15::numeric, 17),
  ('SUGAR', 'BRA', 'Brazil', 485::numeric, 72::numeric, 0.15::numeric, 18),
  ('SOYBEAN_OIL', 'ARG', 'Argentina', 890::numeric, 68::numeric, 0.12::numeric, 19),
  ('SOYBEAN_OIL', 'MYS', 'Malaysia', 920::numeric, 55::numeric, 0.12::numeric, 20),
  ('COTTON', 'IND', 'India', 1650::numeric, 40::numeric, 0.05::numeric, 21),
  ('COTTON', 'USA', 'United States', 1580::numeric, 85::numeric, 0.05::numeric, 22),
  ('FERTILIZER_Urea', 'CHN', 'China', 310::numeric, 45::numeric, 0.03::numeric, 23),
  ('FERTILIZER_Urea', 'QAT', 'Qatar', 295::numeric, 52::numeric, 0.03::numeric, 24),
  ('JUTE', 'BGD', 'Bangladesh', 680::numeric, 0::numeric, 0.0::numeric, 25)
) AS v(commodity, cc, cn, price, ship, tariff, rank)
WHERE NOT EXISTS (
  SELECT 1 FROM commodity_price_logs WHERE created_at > NOW() - INTERVAL '17 days' AND created_at < NOW() - INTERVAL '11 days' LIMIT 1
);

INSERT INTO commodity_price_logs (commodity_code, country_code, country_name, unit_price_usd, shipping_cost_usd, tariff_rate, landed_cost_usd, source_rank, created_at)
SELECT v.commodity, v.cc, v.cn, v.price + (random() * 20 - 10), v.ship, v.tariff, (v.price + v.ship + v.price * v.tariff) + (random() * 15 - 7), v.rank,
  NOW() - INTERVAL '21 days'
FROM (VALUES
  ('RICE_BR28', 'IND', 'India', 438::numeric, 32::numeric, 0.05::numeric, 1),
  ('RICE_BR28', 'MMR', 'Myanmar', 412::numeric, 45::numeric, 0.05::numeric, 2),
  ('RICE_BR28', 'THA', 'Thailand', 455::numeric, 55::numeric, 0.05::numeric, 3),
  ('RICE_BR28', 'VNM', 'Vietnam', 448::numeric, 50::numeric, 0.05::numeric, 4),
  ('WHEAT', 'IND', 'India', 285::numeric, 28::numeric, 0.08::numeric, 5),
  ('WHEAT', 'PAK', 'Pakistan', 268::numeric, 35::numeric, 0.08::numeric, 6),
  ('WHEAT', 'RUS', 'Russia', 240::numeric, 62::numeric, 0.08::numeric, 7),
  ('WHEAT', 'UKR', 'Ukraine', 252::numeric, 58::numeric, 0.08::numeric, 8),
  ('ONION', 'IND', 'India', 395::numeric, 22::numeric, 0.1::numeric, 9),
  ('ONION', 'EGY', 'Egypt', 360::numeric, 48::numeric, 0.1::numeric, 10),
  ('ONION', 'TUR', 'Turkey', 345::numeric, 52::numeric, 0.1::numeric, 11),
  ('LENTIL_MASUR', 'IND', 'India', 535::numeric, 30::numeric, 0.05::numeric, 12),
  ('LENTIL_MASUR', 'CAN', 'Canada', 498::numeric, 65::numeric, 0.05::numeric, 13),
  ('LENTIL_MASUR', 'AUS', 'Australia', 510::numeric, 70::numeric, 0.05::numeric, 14),
  ('POTATO', 'IND', 'India', 180::numeric, 18::numeric, 0.05::numeric, 15),
  ('POTATO', 'NLD', 'Netherlands', 220::numeric, 55::numeric, 0.05::numeric, 16),
  ('SUGAR', 'IND', 'India', 520::numeric, 35::numeric, 0.15::numeric, 17),
  ('SUGAR', 'BRA', 'Brazil', 485::numeric, 72::numeric, 0.15::numeric, 18),
  ('SOYBEAN_OIL', 'ARG', 'Argentina', 890::numeric, 68::numeric, 0.12::numeric, 19),
  ('SOYBEAN_OIL', 'MYS', 'Malaysia', 920::numeric, 55::numeric, 0.12::numeric, 20),
  ('COTTON', 'IND', 'India', 1650::numeric, 40::numeric, 0.05::numeric, 21),
  ('COTTON', 'USA', 'United States', 1580::numeric, 85::numeric, 0.05::numeric, 22),
  ('FERTILIZER_Urea', 'CHN', 'China', 310::numeric, 45::numeric, 0.03::numeric, 23),
  ('FERTILIZER_Urea', 'QAT', 'Qatar', 295::numeric, 52::numeric, 0.03::numeric, 24),
  ('JUTE', 'BGD', 'Bangladesh', 680::numeric, 0::numeric, 0.0::numeric, 25)
) AS v(commodity, cc, cn, price, ship, tariff, rank)
WHERE NOT EXISTS (
  SELECT 1 FROM commodity_price_logs WHERE created_at > NOW() - INTERVAL '24 days' AND created_at < NOW() - INTERVAL '18 days' LIMIT 1
);

INSERT INTO commodity_price_logs (commodity_code, country_code, country_name, unit_price_usd, shipping_cost_usd, tariff_rate, landed_cost_usd, source_rank, created_at)
SELECT v.commodity, v.cc, v.cn, v.price + (random() * 20 - 10), v.ship, v.tariff, (v.price + v.ship + v.price * v.tariff) + (random() * 15 - 7), v.rank,
  NOW() - INTERVAL '28 days'
FROM (VALUES
  ('RICE_BR28', 'IND', 'India', 438::numeric, 32::numeric, 0.05::numeric, 1),
  ('RICE_BR28', 'MMR', 'Myanmar', 412::numeric, 45::numeric, 0.05::numeric, 2),
  ('RICE_BR28', 'THA', 'Thailand', 455::numeric, 55::numeric, 0.05::numeric, 3),
  ('RICE_BR28', 'VNM', 'Vietnam', 448::numeric, 50::numeric, 0.05::numeric, 4),
  ('WHEAT', 'IND', 'India', 285::numeric, 28::numeric, 0.08::numeric, 5),
  ('WHEAT', 'PAK', 'Pakistan', 268::numeric, 35::numeric, 0.08::numeric, 6),
  ('WHEAT', 'RUS', 'Russia', 240::numeric, 62::numeric, 0.08::numeric, 7),
  ('WHEAT', 'UKR', 'Ukraine', 252::numeric, 58::numeric, 0.08::numeric, 8),
  ('ONION', 'IND', 'India', 395::numeric, 22::numeric, 0.1::numeric, 9),
  ('ONION', 'EGY', 'Egypt', 360::numeric, 48::numeric, 0.1::numeric, 10),
  ('ONION', 'TUR', 'Turkey', 345::numeric, 52::numeric, 0.1::numeric, 11),
  ('LENTIL_MASUR', 'IND', 'India', 535::numeric, 30::numeric, 0.05::numeric, 12),
  ('LENTIL_MASUR', 'CAN', 'Canada', 498::numeric, 65::numeric, 0.05::numeric, 13),
  ('LENTIL_MASUR', 'AUS', 'Australia', 510::numeric, 70::numeric, 0.05::numeric, 14),
  ('POTATO', 'IND', 'India', 180::numeric, 18::numeric, 0.05::numeric, 15),
  ('POTATO', 'NLD', 'Netherlands', 220::numeric, 55::numeric, 0.05::numeric, 16),
  ('SUGAR', 'IND', 'India', 520::numeric, 35::numeric, 0.15::numeric, 17),
  ('SUGAR', 'BRA', 'Brazil', 485::numeric, 72::numeric, 0.15::numeric, 18),
  ('SOYBEAN_OIL', 'ARG', 'Argentina', 890::numeric, 68::numeric, 0.12::numeric, 19),
  ('SOYBEAN_OIL', 'MYS', 'Malaysia', 920::numeric, 55::numeric, 0.12::numeric, 20),
  ('COTTON', 'IND', 'India', 1650::numeric, 40::numeric, 0.05::numeric, 21),
  ('COTTON', 'USA', 'United States', 1580::numeric, 85::numeric, 0.05::numeric, 22),
  ('FERTILIZER_Urea', 'CHN', 'China', 310::numeric, 45::numeric, 0.03::numeric, 23),
  ('FERTILIZER_Urea', 'QAT', 'Qatar', 295::numeric, 52::numeric, 0.03::numeric, 24),
  ('JUTE', 'BGD', 'Bangladesh', 680::numeric, 0::numeric, 0.0::numeric, 25)
) AS v(commodity, cc, cn, price, ship, tariff, rank)
WHERE NOT EXISTS (
  SELECT 1 FROM commodity_price_logs WHERE created_at > NOW() - INTERVAL '31 days' AND created_at < NOW() - INTERVAL '25 days' LIMIT 1
);

INSERT INTO commodity_price_logs (commodity_code, country_code, country_name, unit_price_usd, shipping_cost_usd, tariff_rate, landed_cost_usd, source_rank, created_at)
SELECT v.commodity, v.cc, v.cn, v.price + (random() * 20 - 10), v.ship, v.tariff, (v.price + v.ship + v.price * v.tariff) + (random() * 15 - 7), v.rank,
  NOW() - INTERVAL '35 days'
FROM (VALUES
  ('RICE_BR28', 'IND', 'India', 438::numeric, 32::numeric, 0.05::numeric, 1),
  ('RICE_BR28', 'MMR', 'Myanmar', 412::numeric, 45::numeric, 0.05::numeric, 2),
  ('RICE_BR28', 'THA', 'Thailand', 455::numeric, 55::numeric, 0.05::numeric, 3),
  ('RICE_BR28', 'VNM', 'Vietnam', 448::numeric, 50::numeric, 0.05::numeric, 4),
  ('WHEAT', 'IND', 'India', 285::numeric, 28::numeric, 0.08::numeric, 5),
  ('WHEAT', 'PAK', 'Pakistan', 268::numeric, 35::numeric, 0.08::numeric, 6),
  ('WHEAT', 'RUS', 'Russia', 240::numeric, 62::numeric, 0.08::numeric, 7),
  ('WHEAT', 'UKR', 'Ukraine', 252::numeric, 58::numeric, 0.08::numeric, 8),
  ('ONION', 'IND', 'India', 395::numeric, 22::numeric, 0.1::numeric, 9),
  ('ONION', 'EGY', 'Egypt', 360::numeric, 48::numeric, 0.1::numeric, 10),
  ('ONION', 'TUR', 'Turkey', 345::numeric, 52::numeric, 0.1::numeric, 11),
  ('LENTIL_MASUR', 'IND', 'India', 535::numeric, 30::numeric, 0.05::numeric, 12),
  ('LENTIL_MASUR', 'CAN', 'Canada', 498::numeric, 65::numeric, 0.05::numeric, 13),
  ('LENTIL_MASUR', 'AUS', 'Australia', 510::numeric, 70::numeric, 0.05::numeric, 14),
  ('POTATO', 'IND', 'India', 180::numeric, 18::numeric, 0.05::numeric, 15),
  ('POTATO', 'NLD', 'Netherlands', 220::numeric, 55::numeric, 0.05::numeric, 16),
  ('SUGAR', 'IND', 'India', 520::numeric, 35::numeric, 0.15::numeric, 17),
  ('SUGAR', 'BRA', 'Brazil', 485::numeric, 72::numeric, 0.15::numeric, 18),
  ('SOYBEAN_OIL', 'ARG', 'Argentina', 890::numeric, 68::numeric, 0.12::numeric, 19),
  ('SOYBEAN_OIL', 'MYS', 'Malaysia', 920::numeric, 55::numeric, 0.12::numeric, 20),
  ('COTTON', 'IND', 'India', 1650::numeric, 40::numeric, 0.05::numeric, 21),
  ('COTTON', 'USA', 'United States', 1580::numeric, 85::numeric, 0.05::numeric, 22),
  ('FERTILIZER_Urea', 'CHN', 'China', 310::numeric, 45::numeric, 0.03::numeric, 23),
  ('FERTILIZER_Urea', 'QAT', 'Qatar', 295::numeric, 52::numeric, 0.03::numeric, 24),
  ('JUTE', 'BGD', 'Bangladesh', 680::numeric, 0::numeric, 0.0::numeric, 25)
) AS v(commodity, cc, cn, price, ship, tariff, rank)
WHERE NOT EXISTS (
  SELECT 1 FROM commodity_price_logs WHERE created_at > NOW() - INTERVAL '38 days' AND created_at < NOW() - INTERVAL '32 days' LIMIT 1
);

INSERT INTO commodity_price_logs (commodity_code, country_code, country_name, unit_price_usd, shipping_cost_usd, tariff_rate, landed_cost_usd, source_rank, created_at)
SELECT v.commodity, v.cc, v.cn, v.price + (random() * 20 - 10), v.ship, v.tariff, (v.price + v.ship + v.price * v.tariff) + (random() * 15 - 7), v.rank,
  NOW() - INTERVAL '42 days'
FROM (VALUES
  ('RICE_BR28', 'IND', 'India', 438::numeric, 32::numeric, 0.05::numeric, 1),
  ('RICE_BR28', 'MMR', 'Myanmar', 412::numeric, 45::numeric, 0.05::numeric, 2),
  ('RICE_BR28', 'THA', 'Thailand', 455::numeric, 55::numeric, 0.05::numeric, 3),
  ('RICE_BR28', 'VNM', 'Vietnam', 448::numeric, 50::numeric, 0.05::numeric, 4),
  ('WHEAT', 'IND', 'India', 285::numeric, 28::numeric, 0.08::numeric, 5),
  ('WHEAT', 'PAK', 'Pakistan', 268::numeric, 35::numeric, 0.08::numeric, 6),
  ('WHEAT', 'RUS', 'Russia', 240::numeric, 62::numeric, 0.08::numeric, 7),
  ('WHEAT', 'UKR', 'Ukraine', 252::numeric, 58::numeric, 0.08::numeric, 8),
  ('ONION', 'IND', 'India', 395::numeric, 22::numeric, 0.1::numeric, 9),
  ('ONION', 'EGY', 'Egypt', 360::numeric, 48::numeric, 0.1::numeric, 10),
  ('ONION', 'TUR', 'Turkey', 345::numeric, 52::numeric, 0.1::numeric, 11),
  ('LENTIL_MASUR', 'IND', 'India', 535::numeric, 30::numeric, 0.05::numeric, 12),
  ('LENTIL_MASUR', 'CAN', 'Canada', 498::numeric, 65::numeric, 0.05::numeric, 13),
  ('LENTIL_MASUR', 'AUS', 'Australia', 510::numeric, 70::numeric, 0.05::numeric, 14),
  ('POTATO', 'IND', 'India', 180::numeric, 18::numeric, 0.05::numeric, 15),
  ('POTATO', 'NLD', 'Netherlands', 220::numeric, 55::numeric, 0.05::numeric, 16),
  ('SUGAR', 'IND', 'India', 520::numeric, 35::numeric, 0.15::numeric, 17),
  ('SUGAR', 'BRA', 'Brazil', 485::numeric, 72::numeric, 0.15::numeric, 18),
  ('SOYBEAN_OIL', 'ARG', 'Argentina', 890::numeric, 68::numeric, 0.12::numeric, 19),
  ('SOYBEAN_OIL', 'MYS', 'Malaysia', 920::numeric, 55::numeric, 0.12::numeric, 20),
  ('COTTON', 'IND', 'India', 1650::numeric, 40::numeric, 0.05::numeric, 21),
  ('COTTON', 'USA', 'United States', 1580::numeric, 85::numeric, 0.05::numeric, 22),
  ('FERTILIZER_Urea', 'CHN', 'China', 310::numeric, 45::numeric, 0.03::numeric, 23),
  ('FERTILIZER_Urea', 'QAT', 'Qatar', 295::numeric, 52::numeric, 0.03::numeric, 24),
  ('JUTE', 'BGD', 'Bangladesh', 680::numeric, 0::numeric, 0.0::numeric, 25)
) AS v(commodity, cc, cn, price, ship, tariff, rank)
WHERE NOT EXISTS (
  SELECT 1 FROM commodity_price_logs WHERE created_at > NOW() - INTERVAL '45 days' AND created_at < NOW() - INTERVAL '39 days' LIMIT 1
);

INSERT INTO commodity_price_logs (commodity_code, country_code, country_name, unit_price_usd, shipping_cost_usd, tariff_rate, landed_cost_usd, source_rank, created_at)
SELECT v.commodity, v.cc, v.cn, v.price + (random() * 20 - 10), v.ship, v.tariff, (v.price + v.ship + v.price * v.tariff) + (random() * 15 - 7), v.rank,
  NOW() - INTERVAL '49 days'
FROM (VALUES
  ('RICE_BR28', 'IND', 'India', 438::numeric, 32::numeric, 0.05::numeric, 1),
  ('RICE_BR28', 'MMR', 'Myanmar', 412::numeric, 45::numeric, 0.05::numeric, 2),
  ('RICE_BR28', 'THA', 'Thailand', 455::numeric, 55::numeric, 0.05::numeric, 3),
  ('RICE_BR28', 'VNM', 'Vietnam', 448::numeric, 50::numeric, 0.05::numeric, 4),
  ('WHEAT', 'IND', 'India', 285::numeric, 28::numeric, 0.08::numeric, 5),
  ('WHEAT', 'PAK', 'Pakistan', 268::numeric, 35::numeric, 0.08::numeric, 6),
  ('WHEAT', 'RUS', 'Russia', 240::numeric, 62::numeric, 0.08::numeric, 7),
  ('WHEAT', 'UKR', 'Ukraine', 252::numeric, 58::numeric, 0.08::numeric, 8),
  ('ONION', 'IND', 'India', 395::numeric, 22::numeric, 0.1::numeric, 9),
  ('ONION', 'EGY', 'Egypt', 360::numeric, 48::numeric, 0.1::numeric, 10),
  ('ONION', 'TUR', 'Turkey', 345::numeric, 52::numeric, 0.1::numeric, 11),
  ('LENTIL_MASUR', 'IND', 'India', 535::numeric, 30::numeric, 0.05::numeric, 12),
  ('LENTIL_MASUR', 'CAN', 'Canada', 498::numeric, 65::numeric, 0.05::numeric, 13),
  ('LENTIL_MASUR', 'AUS', 'Australia', 510::numeric, 70::numeric, 0.05::numeric, 14),
  ('POTATO', 'IND', 'India', 180::numeric, 18::numeric, 0.05::numeric, 15),
  ('POTATO', 'NLD', 'Netherlands', 220::numeric, 55::numeric, 0.05::numeric, 16),
  ('SUGAR', 'IND', 'India', 520::numeric, 35::numeric, 0.15::numeric, 17),
  ('SUGAR', 'BRA', 'Brazil', 485::numeric, 72::numeric, 0.15::numeric, 18),
  ('SOYBEAN_OIL', 'ARG', 'Argentina', 890::numeric, 68::numeric, 0.12::numeric, 19),
  ('SOYBEAN_OIL', 'MYS', 'Malaysia', 920::numeric, 55::numeric, 0.12::numeric, 20),
  ('COTTON', 'IND', 'India', 1650::numeric, 40::numeric, 0.05::numeric, 21),
  ('COTTON', 'USA', 'United States', 1580::numeric, 85::numeric, 0.05::numeric, 22),
  ('FERTILIZER_Urea', 'CHN', 'China', 310::numeric, 45::numeric, 0.03::numeric, 23),
  ('FERTILIZER_Urea', 'QAT', 'Qatar', 295::numeric, 52::numeric, 0.03::numeric, 24),
  ('JUTE', 'BGD', 'Bangladesh', 680::numeric, 0::numeric, 0.0::numeric, 25)
) AS v(commodity, cc, cn, price, ship, tariff, rank)
WHERE NOT EXISTS (
  SELECT 1 FROM commodity_price_logs WHERE created_at > NOW() - INTERVAL '52 days' AND created_at < NOW() - INTERVAL '46 days' LIMIT 1
);

INSERT INTO commodity_price_logs (commodity_code, country_code, country_name, unit_price_usd, shipping_cost_usd, tariff_rate, landed_cost_usd, source_rank, created_at)
SELECT v.commodity, v.cc, v.cn, v.price + (random() * 20 - 10), v.ship, v.tariff, (v.price + v.ship + v.price * v.tariff) + (random() * 15 - 7), v.rank,
  NOW() - INTERVAL '56 days'
FROM (VALUES
  ('RICE_BR28', 'IND', 'India', 438::numeric, 32::numeric, 0.05::numeric, 1),
  ('RICE_BR28', 'MMR', 'Myanmar', 412::numeric, 45::numeric, 0.05::numeric, 2),
  ('RICE_BR28', 'THA', 'Thailand', 455::numeric, 55::numeric, 0.05::numeric, 3),
  ('RICE_BR28', 'VNM', 'Vietnam', 448::numeric, 50::numeric, 0.05::numeric, 4),
  ('WHEAT', 'IND', 'India', 285::numeric, 28::numeric, 0.08::numeric, 5),
  ('WHEAT', 'PAK', 'Pakistan', 268::numeric, 35::numeric, 0.08::numeric, 6),
  ('WHEAT', 'RUS', 'Russia', 240::numeric, 62::numeric, 0.08::numeric, 7),
  ('WHEAT', 'UKR', 'Ukraine', 252::numeric, 58::numeric, 0.08::numeric, 8),
  ('ONION', 'IND', 'India', 395::numeric, 22::numeric, 0.1::numeric, 9),
  ('ONION', 'EGY', 'Egypt', 360::numeric, 48::numeric, 0.1::numeric, 10),
  ('ONION', 'TUR', 'Turkey', 345::numeric, 52::numeric, 0.1::numeric, 11),
  ('LENTIL_MASUR', 'IND', 'India', 535::numeric, 30::numeric, 0.05::numeric, 12),
  ('LENTIL_MASUR', 'CAN', 'Canada', 498::numeric, 65::numeric, 0.05::numeric, 13),
  ('LENTIL_MASUR', 'AUS', 'Australia', 510::numeric, 70::numeric, 0.05::numeric, 14),
  ('POTATO', 'IND', 'India', 180::numeric, 18::numeric, 0.05::numeric, 15),
  ('POTATO', 'NLD', 'Netherlands', 220::numeric, 55::numeric, 0.05::numeric, 16),
  ('SUGAR', 'IND', 'India', 520::numeric, 35::numeric, 0.15::numeric, 17),
  ('SUGAR', 'BRA', 'Brazil', 485::numeric, 72::numeric, 0.15::numeric, 18),
  ('SOYBEAN_OIL', 'ARG', 'Argentina', 890::numeric, 68::numeric, 0.12::numeric, 19),
  ('SOYBEAN_OIL', 'MYS', 'Malaysia', 920::numeric, 55::numeric, 0.12::numeric, 20),
  ('COTTON', 'IND', 'India', 1650::numeric, 40::numeric, 0.05::numeric, 21),
  ('COTTON', 'USA', 'United States', 1580::numeric, 85::numeric, 0.05::numeric, 22),
  ('FERTILIZER_Urea', 'CHN', 'China', 310::numeric, 45::numeric, 0.03::numeric, 23),
  ('FERTILIZER_Urea', 'QAT', 'Qatar', 295::numeric, 52::numeric, 0.03::numeric, 24),
  ('JUTE', 'BGD', 'Bangladesh', 680::numeric, 0::numeric, 0.0::numeric, 25)
) AS v(commodity, cc, cn, price, ship, tariff, rank)
WHERE NOT EXISTS (
  SELECT 1 FROM commodity_price_logs WHERE created_at > NOW() - INTERVAL '59 days' AND created_at < NOW() - INTERVAL '53 days' LIMIT 1
);

INSERT INTO commodity_price_logs (commodity_code, country_code, country_name, unit_price_usd, shipping_cost_usd, tariff_rate, landed_cost_usd, source_rank, created_at)
SELECT v.commodity, v.cc, v.cn, v.price + (random() * 20 - 10), v.ship, v.tariff, (v.price + v.ship + v.price * v.tariff) + (random() * 15 - 7), v.rank,
  NOW() - INTERVAL '63 days'
FROM (VALUES
  ('RICE_BR28', 'IND', 'India', 438::numeric, 32::numeric, 0.05::numeric, 1),
  ('RICE_BR28', 'MMR', 'Myanmar', 412::numeric, 45::numeric, 0.05::numeric, 2),
  ('RICE_BR28', 'THA', 'Thailand', 455::numeric, 55::numeric, 0.05::numeric, 3),
  ('RICE_BR28', 'VNM', 'Vietnam', 448::numeric, 50::numeric, 0.05::numeric, 4),
  ('WHEAT', 'IND', 'India', 285::numeric, 28::numeric, 0.08::numeric, 5),
  ('WHEAT', 'PAK', 'Pakistan', 268::numeric, 35::numeric, 0.08::numeric, 6),
  ('WHEAT', 'RUS', 'Russia', 240::numeric, 62::numeric, 0.08::numeric, 7),
  ('WHEAT', 'UKR', 'Ukraine', 252::numeric, 58::numeric, 0.08::numeric, 8),
  ('ONION', 'IND', 'India', 395::numeric, 22::numeric, 0.1::numeric, 9),
  ('ONION', 'EGY', 'Egypt', 360::numeric, 48::numeric, 0.1::numeric, 10),
  ('ONION', 'TUR', 'Turkey', 345::numeric, 52::numeric, 0.1::numeric, 11),
  ('LENTIL_MASUR', 'IND', 'India', 535::numeric, 30::numeric, 0.05::numeric, 12),
  ('LENTIL_MASUR', 'CAN', 'Canada', 498::numeric, 65::numeric, 0.05::numeric, 13),
  ('LENTIL_MASUR', 'AUS', 'Australia', 510::numeric, 70::numeric, 0.05::numeric, 14),
  ('POTATO', 'IND', 'India', 180::numeric, 18::numeric, 0.05::numeric, 15),
  ('POTATO', 'NLD', 'Netherlands', 220::numeric, 55::numeric, 0.05::numeric, 16),
  ('SUGAR', 'IND', 'India', 520::numeric, 35::numeric, 0.15::numeric, 17),
  ('SUGAR', 'BRA', 'Brazil', 485::numeric, 72::numeric, 0.15::numeric, 18),
  ('SOYBEAN_OIL', 'ARG', 'Argentina', 890::numeric, 68::numeric, 0.12::numeric, 19),
  ('SOYBEAN_OIL', 'MYS', 'Malaysia', 920::numeric, 55::numeric, 0.12::numeric, 20),
  ('COTTON', 'IND', 'India', 1650::numeric, 40::numeric, 0.05::numeric, 21),
  ('COTTON', 'USA', 'United States', 1580::numeric, 85::numeric, 0.05::numeric, 22),
  ('FERTILIZER_Urea', 'CHN', 'China', 310::numeric, 45::numeric, 0.03::numeric, 23),
  ('FERTILIZER_Urea', 'QAT', 'Qatar', 295::numeric, 52::numeric, 0.03::numeric, 24),
  ('JUTE', 'BGD', 'Bangladesh', 680::numeric, 0::numeric, 0.0::numeric, 25)
) AS v(commodity, cc, cn, price, ship, tariff, rank)
WHERE NOT EXISTS (
  SELECT 1 FROM commodity_price_logs WHERE created_at > NOW() - INTERVAL '66 days' AND created_at < NOW() - INTERVAL '60 days' LIMIT 1
);

INSERT INTO commodity_price_logs (commodity_code, country_code, country_name, unit_price_usd, shipping_cost_usd, tariff_rate, landed_cost_usd, source_rank, created_at)
SELECT v.commodity, v.cc, v.cn, v.price + (random() * 20 - 10), v.ship, v.tariff, (v.price + v.ship + v.price * v.tariff) + (random() * 15 - 7), v.rank,
  NOW() - INTERVAL '70 days'
FROM (VALUES
  ('RICE_BR28', 'IND', 'India', 438::numeric, 32::numeric, 0.05::numeric, 1),
  ('RICE_BR28', 'MMR', 'Myanmar', 412::numeric, 45::numeric, 0.05::numeric, 2),
  ('RICE_BR28', 'THA', 'Thailand', 455::numeric, 55::numeric, 0.05::numeric, 3),
  ('RICE_BR28', 'VNM', 'Vietnam', 448::numeric, 50::numeric, 0.05::numeric, 4),
  ('WHEAT', 'IND', 'India', 285::numeric, 28::numeric, 0.08::numeric, 5),
  ('WHEAT', 'PAK', 'Pakistan', 268::numeric, 35::numeric, 0.08::numeric, 6),
  ('WHEAT', 'RUS', 'Russia', 240::numeric, 62::numeric, 0.08::numeric, 7),
  ('WHEAT', 'UKR', 'Ukraine', 252::numeric, 58::numeric, 0.08::numeric, 8),
  ('ONION', 'IND', 'India', 395::numeric, 22::numeric, 0.1::numeric, 9),
  ('ONION', 'EGY', 'Egypt', 360::numeric, 48::numeric, 0.1::numeric, 10),
  ('ONION', 'TUR', 'Turkey', 345::numeric, 52::numeric, 0.1::numeric, 11),
  ('LENTIL_MASUR', 'IND', 'India', 535::numeric, 30::numeric, 0.05::numeric, 12),
  ('LENTIL_MASUR', 'CAN', 'Canada', 498::numeric, 65::numeric, 0.05::numeric, 13),
  ('LENTIL_MASUR', 'AUS', 'Australia', 510::numeric, 70::numeric, 0.05::numeric, 14),
  ('POTATO', 'IND', 'India', 180::numeric, 18::numeric, 0.05::numeric, 15),
  ('POTATO', 'NLD', 'Netherlands', 220::numeric, 55::numeric, 0.05::numeric, 16),
  ('SUGAR', 'IND', 'India', 520::numeric, 35::numeric, 0.15::numeric, 17),
  ('SUGAR', 'BRA', 'Brazil', 485::numeric, 72::numeric, 0.15::numeric, 18),
  ('SOYBEAN_OIL', 'ARG', 'Argentina', 890::numeric, 68::numeric, 0.12::numeric, 19),
  ('SOYBEAN_OIL', 'MYS', 'Malaysia', 920::numeric, 55::numeric, 0.12::numeric, 20),
  ('COTTON', 'IND', 'India', 1650::numeric, 40::numeric, 0.05::numeric, 21),
  ('COTTON', 'USA', 'United States', 1580::numeric, 85::numeric, 0.05::numeric, 22),
  ('FERTILIZER_Urea', 'CHN', 'China', 310::numeric, 45::numeric, 0.03::numeric, 23),
  ('FERTILIZER_Urea', 'QAT', 'Qatar', 295::numeric, 52::numeric, 0.03::numeric, 24),
  ('JUTE', 'BGD', 'Bangladesh', 680::numeric, 0::numeric, 0.0::numeric, 25)
) AS v(commodity, cc, cn, price, ship, tariff, rank)
WHERE NOT EXISTS (
  SELECT 1 FROM commodity_price_logs WHERE created_at > NOW() - INTERVAL '73 days' AND created_at < NOW() - INTERVAL '67 days' LIMIT 1
);

INSERT INTO commodity_price_logs (commodity_code, country_code, country_name, unit_price_usd, shipping_cost_usd, tariff_rate, landed_cost_usd, source_rank, created_at)
SELECT v.commodity, v.cc, v.cn, v.price + (random() * 20 - 10), v.ship, v.tariff, (v.price + v.ship + v.price * v.tariff) + (random() * 15 - 7), v.rank,
  NOW() - INTERVAL '77 days'
FROM (VALUES
  ('RICE_BR28', 'IND', 'India', 438::numeric, 32::numeric, 0.05::numeric, 1),
  ('RICE_BR28', 'MMR', 'Myanmar', 412::numeric, 45::numeric, 0.05::numeric, 2),
  ('RICE_BR28', 'THA', 'Thailand', 455::numeric, 55::numeric, 0.05::numeric, 3),
  ('RICE_BR28', 'VNM', 'Vietnam', 448::numeric, 50::numeric, 0.05::numeric, 4),
  ('WHEAT', 'IND', 'India', 285::numeric, 28::numeric, 0.08::numeric, 5),
  ('WHEAT', 'PAK', 'Pakistan', 268::numeric, 35::numeric, 0.08::numeric, 6),
  ('WHEAT', 'RUS', 'Russia', 240::numeric, 62::numeric, 0.08::numeric, 7),
  ('WHEAT', 'UKR', 'Ukraine', 252::numeric, 58::numeric, 0.08::numeric, 8),
  ('ONION', 'IND', 'India', 395::numeric, 22::numeric, 0.1::numeric, 9),
  ('ONION', 'EGY', 'Egypt', 360::numeric, 48::numeric, 0.1::numeric, 10),
  ('ONION', 'TUR', 'Turkey', 345::numeric, 52::numeric, 0.1::numeric, 11),
  ('LENTIL_MASUR', 'IND', 'India', 535::numeric, 30::numeric, 0.05::numeric, 12),
  ('LENTIL_MASUR', 'CAN', 'Canada', 498::numeric, 65::numeric, 0.05::numeric, 13),
  ('LENTIL_MASUR', 'AUS', 'Australia', 510::numeric, 70::numeric, 0.05::numeric, 14),
  ('POTATO', 'IND', 'India', 180::numeric, 18::numeric, 0.05::numeric, 15),
  ('POTATO', 'NLD', 'Netherlands', 220::numeric, 55::numeric, 0.05::numeric, 16),
  ('SUGAR', 'IND', 'India', 520::numeric, 35::numeric, 0.15::numeric, 17),
  ('SUGAR', 'BRA', 'Brazil', 485::numeric, 72::numeric, 0.15::numeric, 18),
  ('SOYBEAN_OIL', 'ARG', 'Argentina', 890::numeric, 68::numeric, 0.12::numeric, 19),
  ('SOYBEAN_OIL', 'MYS', 'Malaysia', 920::numeric, 55::numeric, 0.12::numeric, 20),
  ('COTTON', 'IND', 'India', 1650::numeric, 40::numeric, 0.05::numeric, 21),
  ('COTTON', 'USA', 'United States', 1580::numeric, 85::numeric, 0.05::numeric, 22),
  ('FERTILIZER_Urea', 'CHN', 'China', 310::numeric, 45::numeric, 0.03::numeric, 23),
  ('FERTILIZER_Urea', 'QAT', 'Qatar', 295::numeric, 52::numeric, 0.03::numeric, 24),
  ('JUTE', 'BGD', 'Bangladesh', 680::numeric, 0::numeric, 0.0::numeric, 25)
) AS v(commodity, cc, cn, price, ship, tariff, rank)
WHERE NOT EXISTS (
  SELECT 1 FROM commodity_price_logs WHERE created_at > NOW() - INTERVAL '80 days' AND created_at < NOW() - INTERVAL '74 days' LIMIT 1
);

INSERT INTO commodity_price_logs (commodity_code, country_code, country_name, unit_price_usd, shipping_cost_usd, tariff_rate, landed_cost_usd, source_rank, created_at)
SELECT v.commodity, v.cc, v.cn, v.price + (random() * 20 - 10), v.ship, v.tariff, (v.price + v.ship + v.price * v.tariff) + (random() * 15 - 7), v.rank,
  NOW() - INTERVAL '84 days'
FROM (VALUES
  ('RICE_BR28', 'IND', 'India', 438::numeric, 32::numeric, 0.05::numeric, 1),
  ('RICE_BR28', 'MMR', 'Myanmar', 412::numeric, 45::numeric, 0.05::numeric, 2),
  ('RICE_BR28', 'THA', 'Thailand', 455::numeric, 55::numeric, 0.05::numeric, 3),
  ('RICE_BR28', 'VNM', 'Vietnam', 448::numeric, 50::numeric, 0.05::numeric, 4),
  ('WHEAT', 'IND', 'India', 285::numeric, 28::numeric, 0.08::numeric, 5),
  ('WHEAT', 'PAK', 'Pakistan', 268::numeric, 35::numeric, 0.08::numeric, 6),
  ('WHEAT', 'RUS', 'Russia', 240::numeric, 62::numeric, 0.08::numeric, 7),
  ('WHEAT', 'UKR', 'Ukraine', 252::numeric, 58::numeric, 0.08::numeric, 8),
  ('ONION', 'IND', 'India', 395::numeric, 22::numeric, 0.1::numeric, 9),
  ('ONION', 'EGY', 'Egypt', 360::numeric, 48::numeric, 0.1::numeric, 10),
  ('ONION', 'TUR', 'Turkey', 345::numeric, 52::numeric, 0.1::numeric, 11),
  ('LENTIL_MASUR', 'IND', 'India', 535::numeric, 30::numeric, 0.05::numeric, 12),
  ('LENTIL_MASUR', 'CAN', 'Canada', 498::numeric, 65::numeric, 0.05::numeric, 13),
  ('LENTIL_MASUR', 'AUS', 'Australia', 510::numeric, 70::numeric, 0.05::numeric, 14),
  ('POTATO', 'IND', 'India', 180::numeric, 18::numeric, 0.05::numeric, 15),
  ('POTATO', 'NLD', 'Netherlands', 220::numeric, 55::numeric, 0.05::numeric, 16),
  ('SUGAR', 'IND', 'India', 520::numeric, 35::numeric, 0.15::numeric, 17),
  ('SUGAR', 'BRA', 'Brazil', 485::numeric, 72::numeric, 0.15::numeric, 18),
  ('SOYBEAN_OIL', 'ARG', 'Argentina', 890::numeric, 68::numeric, 0.12::numeric, 19),
  ('SOYBEAN_OIL', 'MYS', 'Malaysia', 920::numeric, 55::numeric, 0.12::numeric, 20),
  ('COTTON', 'IND', 'India', 1650::numeric, 40::numeric, 0.05::numeric, 21),
  ('COTTON', 'USA', 'United States', 1580::numeric, 85::numeric, 0.05::numeric, 22),
  ('FERTILIZER_Urea', 'CHN', 'China', 310::numeric, 45::numeric, 0.03::numeric, 23),
  ('FERTILIZER_Urea', 'QAT', 'Qatar', 295::numeric, 52::numeric, 0.03::numeric, 24),
  ('JUTE', 'BGD', 'Bangladesh', 680::numeric, 0::numeric, 0.0::numeric, 25)
) AS v(commodity, cc, cn, price, ship, tariff, rank)
WHERE NOT EXISTS (
  SELECT 1 FROM commodity_price_logs WHERE created_at > NOW() - INTERVAL '87 days' AND created_at < NOW() - INTERVAL '81 days' LIMIT 1
);

INSERT INTO commodity_price_logs (commodity_code, country_code, country_name, unit_price_usd, shipping_cost_usd, tariff_rate, landed_cost_usd, source_rank, created_at)
SELECT v.commodity, v.cc, v.cn, v.price + (random() * 20 - 10), v.ship, v.tariff, (v.price + v.ship + v.price * v.tariff) + (random() * 15 - 7), v.rank,
  NOW() - INTERVAL '91 days'
FROM (VALUES
  ('RICE_BR28', 'IND', 'India', 438::numeric, 32::numeric, 0.05::numeric, 1),
  ('RICE_BR28', 'MMR', 'Myanmar', 412::numeric, 45::numeric, 0.05::numeric, 2),
  ('RICE_BR28', 'THA', 'Thailand', 455::numeric, 55::numeric, 0.05::numeric, 3),
  ('RICE_BR28', 'VNM', 'Vietnam', 448::numeric, 50::numeric, 0.05::numeric, 4),
  ('WHEAT', 'IND', 'India', 285::numeric, 28::numeric, 0.08::numeric, 5),
  ('WHEAT', 'PAK', 'Pakistan', 268::numeric, 35::numeric, 0.08::numeric, 6),
  ('WHEAT', 'RUS', 'Russia', 240::numeric, 62::numeric, 0.08::numeric, 7),
  ('WHEAT', 'UKR', 'Ukraine', 252::numeric, 58::numeric, 0.08::numeric, 8),
  ('ONION', 'IND', 'India', 395::numeric, 22::numeric, 0.1::numeric, 9),
  ('ONION', 'EGY', 'Egypt', 360::numeric, 48::numeric, 0.1::numeric, 10),
  ('ONION', 'TUR', 'Turkey', 345::numeric, 52::numeric, 0.1::numeric, 11),
  ('LENTIL_MASUR', 'IND', 'India', 535::numeric, 30::numeric, 0.05::numeric, 12),
  ('LENTIL_MASUR', 'CAN', 'Canada', 498::numeric, 65::numeric, 0.05::numeric, 13),
  ('LENTIL_MASUR', 'AUS', 'Australia', 510::numeric, 70::numeric, 0.05::numeric, 14),
  ('POTATO', 'IND', 'India', 180::numeric, 18::numeric, 0.05::numeric, 15),
  ('POTATO', 'NLD', 'Netherlands', 220::numeric, 55::numeric, 0.05::numeric, 16),
  ('SUGAR', 'IND', 'India', 520::numeric, 35::numeric, 0.15::numeric, 17),
  ('SUGAR', 'BRA', 'Brazil', 485::numeric, 72::numeric, 0.15::numeric, 18),
  ('SOYBEAN_OIL', 'ARG', 'Argentina', 890::numeric, 68::numeric, 0.12::numeric, 19),
  ('SOYBEAN_OIL', 'MYS', 'Malaysia', 920::numeric, 55::numeric, 0.12::numeric, 20),
  ('COTTON', 'IND', 'India', 1650::numeric, 40::numeric, 0.05::numeric, 21),
  ('COTTON', 'USA', 'United States', 1580::numeric, 85::numeric, 0.05::numeric, 22),
  ('FERTILIZER_Urea', 'CHN', 'China', 310::numeric, 45::numeric, 0.03::numeric, 23),
  ('FERTILIZER_Urea', 'QAT', 'Qatar', 295::numeric, 52::numeric, 0.03::numeric, 24),
  ('JUTE', 'BGD', 'Bangladesh', 680::numeric, 0::numeric, 0.0::numeric, 25)
) AS v(commodity, cc, cn, price, ship, tariff, rank)
WHERE NOT EXISTS (
  SELECT 1 FROM commodity_price_logs WHERE created_at > NOW() - INTERVAL '94 days' AND created_at < NOW() - INTERVAL '88 days' LIMIT 1
);

INSERT INTO commodity_price_logs (commodity_code, country_code, country_name, unit_price_usd, shipping_cost_usd, tariff_rate, landed_cost_usd, source_rank, created_at)
SELECT v.commodity, v.cc, v.cn, v.price + (random() * 20 - 10), v.ship, v.tariff, (v.price + v.ship + v.price * v.tariff) + (random() * 15 - 7), v.rank,
  NOW() - INTERVAL '98 days'
FROM (VALUES
  ('RICE_BR28', 'IND', 'India', 438::numeric, 32::numeric, 0.05::numeric, 1),
  ('RICE_BR28', 'MMR', 'Myanmar', 412::numeric, 45::numeric, 0.05::numeric, 2),
  ('RICE_BR28', 'THA', 'Thailand', 455::numeric, 55::numeric, 0.05::numeric, 3),
  ('RICE_BR28', 'VNM', 'Vietnam', 448::numeric, 50::numeric, 0.05::numeric, 4),
  ('WHEAT', 'IND', 'India', 285::numeric, 28::numeric, 0.08::numeric, 5),
  ('WHEAT', 'PAK', 'Pakistan', 268::numeric, 35::numeric, 0.08::numeric, 6),
  ('WHEAT', 'RUS', 'Russia', 240::numeric, 62::numeric, 0.08::numeric, 7),
  ('WHEAT', 'UKR', 'Ukraine', 252::numeric, 58::numeric, 0.08::numeric, 8),
  ('ONION', 'IND', 'India', 395::numeric, 22::numeric, 0.1::numeric, 9),
  ('ONION', 'EGY', 'Egypt', 360::numeric, 48::numeric, 0.1::numeric, 10),
  ('ONION', 'TUR', 'Turkey', 345::numeric, 52::numeric, 0.1::numeric, 11),
  ('LENTIL_MASUR', 'IND', 'India', 535::numeric, 30::numeric, 0.05::numeric, 12),
  ('LENTIL_MASUR', 'CAN', 'Canada', 498::numeric, 65::numeric, 0.05::numeric, 13),
  ('LENTIL_MASUR', 'AUS', 'Australia', 510::numeric, 70::numeric, 0.05::numeric, 14),
  ('POTATO', 'IND', 'India', 180::numeric, 18::numeric, 0.05::numeric, 15),
  ('POTATO', 'NLD', 'Netherlands', 220::numeric, 55::numeric, 0.05::numeric, 16),
  ('SUGAR', 'IND', 'India', 520::numeric, 35::numeric, 0.15::numeric, 17),
  ('SUGAR', 'BRA', 'Brazil', 485::numeric, 72::numeric, 0.15::numeric, 18),
  ('SOYBEAN_OIL', 'ARG', 'Argentina', 890::numeric, 68::numeric, 0.12::numeric, 19),
  ('SOYBEAN_OIL', 'MYS', 'Malaysia', 920::numeric, 55::numeric, 0.12::numeric, 20),
  ('COTTON', 'IND', 'India', 1650::numeric, 40::numeric, 0.05::numeric, 21),
  ('COTTON', 'USA', 'United States', 1580::numeric, 85::numeric, 0.05::numeric, 22),
  ('FERTILIZER_Urea', 'CHN', 'China', 310::numeric, 45::numeric, 0.03::numeric, 23),
  ('FERTILIZER_Urea', 'QAT', 'Qatar', 295::numeric, 52::numeric, 0.03::numeric, 24),
  ('JUTE', 'BGD', 'Bangladesh', 680::numeric, 0::numeric, 0.0::numeric, 25)
) AS v(commodity, cc, cn, price, ship, tariff, rank)
WHERE NOT EXISTS (
  SELECT 1 FROM commodity_price_logs WHERE created_at > NOW() - INTERVAL '101 days' AND created_at < NOW() - INTERVAL '95 days' LIMIT 1
);

INSERT INTO commodity_price_logs (commodity_code, country_code, country_name, unit_price_usd, shipping_cost_usd, tariff_rate, landed_cost_usd, source_rank, created_at)
SELECT v.commodity, v.cc, v.cn, v.price + (random() * 20 - 10), v.ship, v.tariff, (v.price + v.ship + v.price * v.tariff) + (random() * 15 - 7), v.rank,
  NOW() - INTERVAL '105 days'
FROM (VALUES
  ('RICE_BR28', 'IND', 'India', 438::numeric, 32::numeric, 0.05::numeric, 1),
  ('RICE_BR28', 'MMR', 'Myanmar', 412::numeric, 45::numeric, 0.05::numeric, 2),
  ('RICE_BR28', 'THA', 'Thailand', 455::numeric, 55::numeric, 0.05::numeric, 3),
  ('RICE_BR28', 'VNM', 'Vietnam', 448::numeric, 50::numeric, 0.05::numeric, 4),
  ('WHEAT', 'IND', 'India', 285::numeric, 28::numeric, 0.08::numeric, 5),
  ('WHEAT', 'PAK', 'Pakistan', 268::numeric, 35::numeric, 0.08::numeric, 6),
  ('WHEAT', 'RUS', 'Russia', 240::numeric, 62::numeric, 0.08::numeric, 7),
  ('WHEAT', 'UKR', 'Ukraine', 252::numeric, 58::numeric, 0.08::numeric, 8),
  ('ONION', 'IND', 'India', 395::numeric, 22::numeric, 0.1::numeric, 9),
  ('ONION', 'EGY', 'Egypt', 360::numeric, 48::numeric, 0.1::numeric, 10),
  ('ONION', 'TUR', 'Turkey', 345::numeric, 52::numeric, 0.1::numeric, 11),
  ('LENTIL_MASUR', 'IND', 'India', 535::numeric, 30::numeric, 0.05::numeric, 12),
  ('LENTIL_MASUR', 'CAN', 'Canada', 498::numeric, 65::numeric, 0.05::numeric, 13),
  ('LENTIL_MASUR', 'AUS', 'Australia', 510::numeric, 70::numeric, 0.05::numeric, 14),
  ('POTATO', 'IND', 'India', 180::numeric, 18::numeric, 0.05::numeric, 15),
  ('POTATO', 'NLD', 'Netherlands', 220::numeric, 55::numeric, 0.05::numeric, 16),
  ('SUGAR', 'IND', 'India', 520::numeric, 35::numeric, 0.15::numeric, 17),
  ('SUGAR', 'BRA', 'Brazil', 485::numeric, 72::numeric, 0.15::numeric, 18),
  ('SOYBEAN_OIL', 'ARG', 'Argentina', 890::numeric, 68::numeric, 0.12::numeric, 19),
  ('SOYBEAN_OIL', 'MYS', 'Malaysia', 920::numeric, 55::numeric, 0.12::numeric, 20),
  ('COTTON', 'IND', 'India', 1650::numeric, 40::numeric, 0.05::numeric, 21),
  ('COTTON', 'USA', 'United States', 1580::numeric, 85::numeric, 0.05::numeric, 22),
  ('FERTILIZER_Urea', 'CHN', 'China', 310::numeric, 45::numeric, 0.03::numeric, 23),
  ('FERTILIZER_Urea', 'QAT', 'Qatar', 295::numeric, 52::numeric, 0.03::numeric, 24),
  ('JUTE', 'BGD', 'Bangladesh', 680::numeric, 0::numeric, 0.0::numeric, 25)
) AS v(commodity, cc, cn, price, ship, tariff, rank)
WHERE NOT EXISTS (
  SELECT 1 FROM commodity_price_logs WHERE created_at > NOW() - INTERVAL '108 days' AND created_at < NOW() - INTERVAL '102 days' LIMIT 1
);

INSERT INTO commodity_price_logs (commodity_code, country_code, country_name, unit_price_usd, shipping_cost_usd, tariff_rate, landed_cost_usd, source_rank, created_at)
SELECT v.commodity, v.cc, v.cn, v.price + (random() * 20 - 10), v.ship, v.tariff, (v.price + v.ship + v.price * v.tariff) + (random() * 15 - 7), v.rank,
  NOW() - INTERVAL '112 days'
FROM (VALUES
  ('RICE_BR28', 'IND', 'India', 438::numeric, 32::numeric, 0.05::numeric, 1),
  ('RICE_BR28', 'MMR', 'Myanmar', 412::numeric, 45::numeric, 0.05::numeric, 2),
  ('RICE_BR28', 'THA', 'Thailand', 455::numeric, 55::numeric, 0.05::numeric, 3),
  ('RICE_BR28', 'VNM', 'Vietnam', 448::numeric, 50::numeric, 0.05::numeric, 4),
  ('WHEAT', 'IND', 'India', 285::numeric, 28::numeric, 0.08::numeric, 5),
  ('WHEAT', 'PAK', 'Pakistan', 268::numeric, 35::numeric, 0.08::numeric, 6),
  ('WHEAT', 'RUS', 'Russia', 240::numeric, 62::numeric, 0.08::numeric, 7),
  ('WHEAT', 'UKR', 'Ukraine', 252::numeric, 58::numeric, 0.08::numeric, 8),
  ('ONION', 'IND', 'India', 395::numeric, 22::numeric, 0.1::numeric, 9),
  ('ONION', 'EGY', 'Egypt', 360::numeric, 48::numeric, 0.1::numeric, 10),
  ('ONION', 'TUR', 'Turkey', 345::numeric, 52::numeric, 0.1::numeric, 11),
  ('LENTIL_MASUR', 'IND', 'India', 535::numeric, 30::numeric, 0.05::numeric, 12),
  ('LENTIL_MASUR', 'CAN', 'Canada', 498::numeric, 65::numeric, 0.05::numeric, 13),
  ('LENTIL_MASUR', 'AUS', 'Australia', 510::numeric, 70::numeric, 0.05::numeric, 14),
  ('POTATO', 'IND', 'India', 180::numeric, 18::numeric, 0.05::numeric, 15),
  ('POTATO', 'NLD', 'Netherlands', 220::numeric, 55::numeric, 0.05::numeric, 16),
  ('SUGAR', 'IND', 'India', 520::numeric, 35::numeric, 0.15::numeric, 17),
  ('SUGAR', 'BRA', 'Brazil', 485::numeric, 72::numeric, 0.15::numeric, 18),
  ('SOYBEAN_OIL', 'ARG', 'Argentina', 890::numeric, 68::numeric, 0.12::numeric, 19),
  ('SOYBEAN_OIL', 'MYS', 'Malaysia', 920::numeric, 55::numeric, 0.12::numeric, 20),
  ('COTTON', 'IND', 'India', 1650::numeric, 40::numeric, 0.05::numeric, 21),
  ('COTTON', 'USA', 'United States', 1580::numeric, 85::numeric, 0.05::numeric, 22),
  ('FERTILIZER_Urea', 'CHN', 'China', 310::numeric, 45::numeric, 0.03::numeric, 23),
  ('FERTILIZER_Urea', 'QAT', 'Qatar', 295::numeric, 52::numeric, 0.03::numeric, 24),
  ('JUTE', 'BGD', 'Bangladesh', 680::numeric, 0::numeric, 0.0::numeric, 25)
) AS v(commodity, cc, cn, price, ship, tariff, rank)
WHERE NOT EXISTS (
  SELECT 1 FROM commodity_price_logs WHERE created_at > NOW() - INTERVAL '115 days' AND created_at < NOW() - INTERVAL '109 days' LIMIT 1
);

INSERT INTO commodity_price_logs (commodity_code, country_code, country_name, unit_price_usd, shipping_cost_usd, tariff_rate, landed_cost_usd, source_rank, created_at)
SELECT v.commodity, v.cc, v.cn, v.price + (random() * 20 - 10), v.ship, v.tariff, (v.price + v.ship + v.price * v.tariff) + (random() * 15 - 7), v.rank,
  NOW() - INTERVAL '119 days'
FROM (VALUES
  ('RICE_BR28', 'IND', 'India', 438::numeric, 32::numeric, 0.05::numeric, 1),
  ('RICE_BR28', 'MMR', 'Myanmar', 412::numeric, 45::numeric, 0.05::numeric, 2),
  ('RICE_BR28', 'THA', 'Thailand', 455::numeric, 55::numeric, 0.05::numeric, 3),
  ('RICE_BR28', 'VNM', 'Vietnam', 448::numeric, 50::numeric, 0.05::numeric, 4),
  ('WHEAT', 'IND', 'India', 285::numeric, 28::numeric, 0.08::numeric, 5),
  ('WHEAT', 'PAK', 'Pakistan', 268::numeric, 35::numeric, 0.08::numeric, 6),
  ('WHEAT', 'RUS', 'Russia', 240::numeric, 62::numeric, 0.08::numeric, 7),
  ('WHEAT', 'UKR', 'Ukraine', 252::numeric, 58::numeric, 0.08::numeric, 8),
  ('ONION', 'IND', 'India', 395::numeric, 22::numeric, 0.1::numeric, 9),
  ('ONION', 'EGY', 'Egypt', 360::numeric, 48::numeric, 0.1::numeric, 10),
  ('ONION', 'TUR', 'Turkey', 345::numeric, 52::numeric, 0.1::numeric, 11),
  ('LENTIL_MASUR', 'IND', 'India', 535::numeric, 30::numeric, 0.05::numeric, 12),
  ('LENTIL_MASUR', 'CAN', 'Canada', 498::numeric, 65::numeric, 0.05::numeric, 13),
  ('LENTIL_MASUR', 'AUS', 'Australia', 510::numeric, 70::numeric, 0.05::numeric, 14),
  ('POTATO', 'IND', 'India', 180::numeric, 18::numeric, 0.05::numeric, 15),
  ('POTATO', 'NLD', 'Netherlands', 220::numeric, 55::numeric, 0.05::numeric, 16),
  ('SUGAR', 'IND', 'India', 520::numeric, 35::numeric, 0.15::numeric, 17),
  ('SUGAR', 'BRA', 'Brazil', 485::numeric, 72::numeric, 0.15::numeric, 18),
  ('SOYBEAN_OIL', 'ARG', 'Argentina', 890::numeric, 68::numeric, 0.12::numeric, 19),
  ('SOYBEAN_OIL', 'MYS', 'Malaysia', 920::numeric, 55::numeric, 0.12::numeric, 20),
  ('COTTON', 'IND', 'India', 1650::numeric, 40::numeric, 0.05::numeric, 21),
  ('COTTON', 'USA', 'United States', 1580::numeric, 85::numeric, 0.05::numeric, 22),
  ('FERTILIZER_Urea', 'CHN', 'China', 310::numeric, 45::numeric, 0.03::numeric, 23),
  ('FERTILIZER_Urea', 'QAT', 'Qatar', 295::numeric, 52::numeric, 0.03::numeric, 24),
  ('JUTE', 'BGD', 'Bangladesh', 680::numeric, 0::numeric, 0.0::numeric, 25)
) AS v(commodity, cc, cn, price, ship, tariff, rank)
WHERE NOT EXISTS (
  SELECT 1 FROM commodity_price_logs WHERE created_at > NOW() - INTERVAL '122 days' AND created_at < NOW() - INTERVAL '116 days' LIMIT 1
);

INSERT INTO commodity_price_logs (commodity_code, country_code, country_name, unit_price_usd, shipping_cost_usd, tariff_rate, landed_cost_usd, source_rank, created_at)
SELECT v.commodity, v.cc, v.cn, v.price + (random() * 20 - 10), v.ship, v.tariff, (v.price + v.ship + v.price * v.tariff) + (random() * 15 - 7), v.rank,
  NOW() - INTERVAL '126 days'
FROM (VALUES
  ('RICE_BR28', 'IND', 'India', 438::numeric, 32::numeric, 0.05::numeric, 1),
  ('RICE_BR28', 'MMR', 'Myanmar', 412::numeric, 45::numeric, 0.05::numeric, 2),
  ('RICE_BR28', 'THA', 'Thailand', 455::numeric, 55::numeric, 0.05::numeric, 3),
  ('RICE_BR28', 'VNM', 'Vietnam', 448::numeric, 50::numeric, 0.05::numeric, 4),
  ('WHEAT', 'IND', 'India', 285::numeric, 28::numeric, 0.08::numeric, 5),
  ('WHEAT', 'PAK', 'Pakistan', 268::numeric, 35::numeric, 0.08::numeric, 6),
  ('WHEAT', 'RUS', 'Russia', 240::numeric, 62::numeric, 0.08::numeric, 7),
  ('WHEAT', 'UKR', 'Ukraine', 252::numeric, 58::numeric, 0.08::numeric, 8),
  ('ONION', 'IND', 'India', 395::numeric, 22::numeric, 0.1::numeric, 9),
  ('ONION', 'EGY', 'Egypt', 360::numeric, 48::numeric, 0.1::numeric, 10),
  ('ONION', 'TUR', 'Turkey', 345::numeric, 52::numeric, 0.1::numeric, 11),
  ('LENTIL_MASUR', 'IND', 'India', 535::numeric, 30::numeric, 0.05::numeric, 12),
  ('LENTIL_MASUR', 'CAN', 'Canada', 498::numeric, 65::numeric, 0.05::numeric, 13),
  ('LENTIL_MASUR', 'AUS', 'Australia', 510::numeric, 70::numeric, 0.05::numeric, 14),
  ('POTATO', 'IND', 'India', 180::numeric, 18::numeric, 0.05::numeric, 15),
  ('POTATO', 'NLD', 'Netherlands', 220::numeric, 55::numeric, 0.05::numeric, 16),
  ('SUGAR', 'IND', 'India', 520::numeric, 35::numeric, 0.15::numeric, 17),
  ('SUGAR', 'BRA', 'Brazil', 485::numeric, 72::numeric, 0.15::numeric, 18),
  ('SOYBEAN_OIL', 'ARG', 'Argentina', 890::numeric, 68::numeric, 0.12::numeric, 19),
  ('SOYBEAN_OIL', 'MYS', 'Malaysia', 920::numeric, 55::numeric, 0.12::numeric, 20),
  ('COTTON', 'IND', 'India', 1650::numeric, 40::numeric, 0.05::numeric, 21),
  ('COTTON', 'USA', 'United States', 1580::numeric, 85::numeric, 0.05::numeric, 22),
  ('FERTILIZER_Urea', 'CHN', 'China', 310::numeric, 45::numeric, 0.03::numeric, 23),
  ('FERTILIZER_Urea', 'QAT', 'Qatar', 295::numeric, 52::numeric, 0.03::numeric, 24),
  ('JUTE', 'BGD', 'Bangladesh', 680::numeric, 0::numeric, 0.0::numeric, 25)
) AS v(commodity, cc, cn, price, ship, tariff, rank)
WHERE NOT EXISTS (
  SELECT 1 FROM commodity_price_logs WHERE created_at > NOW() - INTERVAL '129 days' AND created_at < NOW() - INTERVAL '123 days' LIMIT 1
);

INSERT INTO commodity_price_logs (commodity_code, country_code, country_name, unit_price_usd, shipping_cost_usd, tariff_rate, landed_cost_usd, source_rank, created_at)
SELECT v.commodity, v.cc, v.cn, v.price + (random() * 20 - 10), v.ship, v.tariff, (v.price + v.ship + v.price * v.tariff) + (random() * 15 - 7), v.rank,
  NOW() - INTERVAL '133 days'
FROM (VALUES
  ('RICE_BR28', 'IND', 'India', 438::numeric, 32::numeric, 0.05::numeric, 1),
  ('RICE_BR28', 'MMR', 'Myanmar', 412::numeric, 45::numeric, 0.05::numeric, 2),
  ('RICE_BR28', 'THA', 'Thailand', 455::numeric, 55::numeric, 0.05::numeric, 3),
  ('RICE_BR28', 'VNM', 'Vietnam', 448::numeric, 50::numeric, 0.05::numeric, 4),
  ('WHEAT', 'IND', 'India', 285::numeric, 28::numeric, 0.08::numeric, 5),
  ('WHEAT', 'PAK', 'Pakistan', 268::numeric, 35::numeric, 0.08::numeric, 6),
  ('WHEAT', 'RUS', 'Russia', 240::numeric, 62::numeric, 0.08::numeric, 7),
  ('WHEAT', 'UKR', 'Ukraine', 252::numeric, 58::numeric, 0.08::numeric, 8),
  ('ONION', 'IND', 'India', 395::numeric, 22::numeric, 0.1::numeric, 9),
  ('ONION', 'EGY', 'Egypt', 360::numeric, 48::numeric, 0.1::numeric, 10),
  ('ONION', 'TUR', 'Turkey', 345::numeric, 52::numeric, 0.1::numeric, 11),
  ('LENTIL_MASUR', 'IND', 'India', 535::numeric, 30::numeric, 0.05::numeric, 12),
  ('LENTIL_MASUR', 'CAN', 'Canada', 498::numeric, 65::numeric, 0.05::numeric, 13),
  ('LENTIL_MASUR', 'AUS', 'Australia', 510::numeric, 70::numeric, 0.05::numeric, 14),
  ('POTATO', 'IND', 'India', 180::numeric, 18::numeric, 0.05::numeric, 15),
  ('POTATO', 'NLD', 'Netherlands', 220::numeric, 55::numeric, 0.05::numeric, 16),
  ('SUGAR', 'IND', 'India', 520::numeric, 35::numeric, 0.15::numeric, 17),
  ('SUGAR', 'BRA', 'Brazil', 485::numeric, 72::numeric, 0.15::numeric, 18),
  ('SOYBEAN_OIL', 'ARG', 'Argentina', 890::numeric, 68::numeric, 0.12::numeric, 19),
  ('SOYBEAN_OIL', 'MYS', 'Malaysia', 920::numeric, 55::numeric, 0.12::numeric, 20),
  ('COTTON', 'IND', 'India', 1650::numeric, 40::numeric, 0.05::numeric, 21),
  ('COTTON', 'USA', 'United States', 1580::numeric, 85::numeric, 0.05::numeric, 22),
  ('FERTILIZER_Urea', 'CHN', 'China', 310::numeric, 45::numeric, 0.03::numeric, 23),
  ('FERTILIZER_Urea', 'QAT', 'Qatar', 295::numeric, 52::numeric, 0.03::numeric, 24),
  ('JUTE', 'BGD', 'Bangladesh', 680::numeric, 0::numeric, 0.0::numeric, 25)
) AS v(commodity, cc, cn, price, ship, tariff, rank)
WHERE NOT EXISTS (
  SELECT 1 FROM commodity_price_logs WHERE created_at > NOW() - INTERVAL '136 days' AND created_at < NOW() - INTERVAL '130 days' LIMIT 1
);

INSERT INTO commodity_price_logs (commodity_code, country_code, country_name, unit_price_usd, shipping_cost_usd, tariff_rate, landed_cost_usd, source_rank, created_at)
SELECT v.commodity, v.cc, v.cn, v.price + (random() * 20 - 10), v.ship, v.tariff, (v.price + v.ship + v.price * v.tariff) + (random() * 15 - 7), v.rank,
  NOW() - INTERVAL '140 days'
FROM (VALUES
  ('RICE_BR28', 'IND', 'India', 438::numeric, 32::numeric, 0.05::numeric, 1),
  ('RICE_BR28', 'MMR', 'Myanmar', 412::numeric, 45::numeric, 0.05::numeric, 2),
  ('RICE_BR28', 'THA', 'Thailand', 455::numeric, 55::numeric, 0.05::numeric, 3),
  ('RICE_BR28', 'VNM', 'Vietnam', 448::numeric, 50::numeric, 0.05::numeric, 4),
  ('WHEAT', 'IND', 'India', 285::numeric, 28::numeric, 0.08::numeric, 5),
  ('WHEAT', 'PAK', 'Pakistan', 268::numeric, 35::numeric, 0.08::numeric, 6),
  ('WHEAT', 'RUS', 'Russia', 240::numeric, 62::numeric, 0.08::numeric, 7),
  ('WHEAT', 'UKR', 'Ukraine', 252::numeric, 58::numeric, 0.08::numeric, 8),
  ('ONION', 'IND', 'India', 395::numeric, 22::numeric, 0.1::numeric, 9),
  ('ONION', 'EGY', 'Egypt', 360::numeric, 48::numeric, 0.1::numeric, 10),
  ('ONION', 'TUR', 'Turkey', 345::numeric, 52::numeric, 0.1::numeric, 11),
  ('LENTIL_MASUR', 'IND', 'India', 535::numeric, 30::numeric, 0.05::numeric, 12),
  ('LENTIL_MASUR', 'CAN', 'Canada', 498::numeric, 65::numeric, 0.05::numeric, 13),
  ('LENTIL_MASUR', 'AUS', 'Australia', 510::numeric, 70::numeric, 0.05::numeric, 14),
  ('POTATO', 'IND', 'India', 180::numeric, 18::numeric, 0.05::numeric, 15),
  ('POTATO', 'NLD', 'Netherlands', 220::numeric, 55::numeric, 0.05::numeric, 16),
  ('SUGAR', 'IND', 'India', 520::numeric, 35::numeric, 0.15::numeric, 17),
  ('SUGAR', 'BRA', 'Brazil', 485::numeric, 72::numeric, 0.15::numeric, 18),
  ('SOYBEAN_OIL', 'ARG', 'Argentina', 890::numeric, 68::numeric, 0.12::numeric, 19),
  ('SOYBEAN_OIL', 'MYS', 'Malaysia', 920::numeric, 55::numeric, 0.12::numeric, 20),
  ('COTTON', 'IND', 'India', 1650::numeric, 40::numeric, 0.05::numeric, 21),
  ('COTTON', 'USA', 'United States', 1580::numeric, 85::numeric, 0.05::numeric, 22),
  ('FERTILIZER_Urea', 'CHN', 'China', 310::numeric, 45::numeric, 0.03::numeric, 23),
  ('FERTILIZER_Urea', 'QAT', 'Qatar', 295::numeric, 52::numeric, 0.03::numeric, 24),
  ('JUTE', 'BGD', 'Bangladesh', 680::numeric, 0::numeric, 0.0::numeric, 25)
) AS v(commodity, cc, cn, price, ship, tariff, rank)
WHERE NOT EXISTS (
  SELECT 1 FROM commodity_price_logs WHERE created_at > NOW() - INTERVAL '143 days' AND created_at < NOW() - INTERVAL '137 days' LIMIT 1
);

INSERT INTO commodity_price_logs (commodity_code, country_code, country_name, unit_price_usd, shipping_cost_usd, tariff_rate, landed_cost_usd, source_rank, created_at)
SELECT v.commodity, v.cc, v.cn, v.price + (random() * 20 - 10), v.ship, v.tariff, (v.price + v.ship + v.price * v.tariff) + (random() * 15 - 7), v.rank,
  NOW() - INTERVAL '147 days'
FROM (VALUES
  ('RICE_BR28', 'IND', 'India', 438::numeric, 32::numeric, 0.05::numeric, 1),
  ('RICE_BR28', 'MMR', 'Myanmar', 412::numeric, 45::numeric, 0.05::numeric, 2),
  ('RICE_BR28', 'THA', 'Thailand', 455::numeric, 55::numeric, 0.05::numeric, 3),
  ('RICE_BR28', 'VNM', 'Vietnam', 448::numeric, 50::numeric, 0.05::numeric, 4),
  ('WHEAT', 'IND', 'India', 285::numeric, 28::numeric, 0.08::numeric, 5),
  ('WHEAT', 'PAK', 'Pakistan', 268::numeric, 35::numeric, 0.08::numeric, 6),
  ('WHEAT', 'RUS', 'Russia', 240::numeric, 62::numeric, 0.08::numeric, 7),
  ('WHEAT', 'UKR', 'Ukraine', 252::numeric, 58::numeric, 0.08::numeric, 8),
  ('ONION', 'IND', 'India', 395::numeric, 22::numeric, 0.1::numeric, 9),
  ('ONION', 'EGY', 'Egypt', 360::numeric, 48::numeric, 0.1::numeric, 10),
  ('ONION', 'TUR', 'Turkey', 345::numeric, 52::numeric, 0.1::numeric, 11),
  ('LENTIL_MASUR', 'IND', 'India', 535::numeric, 30::numeric, 0.05::numeric, 12),
  ('LENTIL_MASUR', 'CAN', 'Canada', 498::numeric, 65::numeric, 0.05::numeric, 13),
  ('LENTIL_MASUR', 'AUS', 'Australia', 510::numeric, 70::numeric, 0.05::numeric, 14),
  ('POTATO', 'IND', 'India', 180::numeric, 18::numeric, 0.05::numeric, 15),
  ('POTATO', 'NLD', 'Netherlands', 220::numeric, 55::numeric, 0.05::numeric, 16),
  ('SUGAR', 'IND', 'India', 520::numeric, 35::numeric, 0.15::numeric, 17),
  ('SUGAR', 'BRA', 'Brazil', 485::numeric, 72::numeric, 0.15::numeric, 18),
  ('SOYBEAN_OIL', 'ARG', 'Argentina', 890::numeric, 68::numeric, 0.12::numeric, 19),
  ('SOYBEAN_OIL', 'MYS', 'Malaysia', 920::numeric, 55::numeric, 0.12::numeric, 20),
  ('COTTON', 'IND', 'India', 1650::numeric, 40::numeric, 0.05::numeric, 21),
  ('COTTON', 'USA', 'United States', 1580::numeric, 85::numeric, 0.05::numeric, 22),
  ('FERTILIZER_Urea', 'CHN', 'China', 310::numeric, 45::numeric, 0.03::numeric, 23),
  ('FERTILIZER_Urea', 'QAT', 'Qatar', 295::numeric, 52::numeric, 0.03::numeric, 24),
  ('JUTE', 'BGD', 'Bangladesh', 680::numeric, 0::numeric, 0.0::numeric, 25)
) AS v(commodity, cc, cn, price, ship, tariff, rank)
WHERE NOT EXISTS (
  SELECT 1 FROM commodity_price_logs WHERE created_at > NOW() - INTERVAL '150 days' AND created_at < NOW() - INTERVAL '144 days' LIMIT 1
);

INSERT INTO commodity_price_logs (commodity_code, country_code, country_name, unit_price_usd, shipping_cost_usd, tariff_rate, landed_cost_usd, source_rank, created_at)
SELECT v.commodity, v.cc, v.cn, v.price + (random() * 20 - 10), v.ship, v.tariff, (v.price + v.ship + v.price * v.tariff) + (random() * 15 - 7), v.rank,
  NOW() - INTERVAL '154 days'
FROM (VALUES
  ('RICE_BR28', 'IND', 'India', 438::numeric, 32::numeric, 0.05::numeric, 1),
  ('RICE_BR28', 'MMR', 'Myanmar', 412::numeric, 45::numeric, 0.05::numeric, 2),
  ('RICE_BR28', 'THA', 'Thailand', 455::numeric, 55::numeric, 0.05::numeric, 3),
  ('RICE_BR28', 'VNM', 'Vietnam', 448::numeric, 50::numeric, 0.05::numeric, 4),
  ('WHEAT', 'IND', 'India', 285::numeric, 28::numeric, 0.08::numeric, 5),
  ('WHEAT', 'PAK', 'Pakistan', 268::numeric, 35::numeric, 0.08::numeric, 6),
  ('WHEAT', 'RUS', 'Russia', 240::numeric, 62::numeric, 0.08::numeric, 7),
  ('WHEAT', 'UKR', 'Ukraine', 252::numeric, 58::numeric, 0.08::numeric, 8),
  ('ONION', 'IND', 'India', 395::numeric, 22::numeric, 0.1::numeric, 9),
  ('ONION', 'EGY', 'Egypt', 360::numeric, 48::numeric, 0.1::numeric, 10),
  ('ONION', 'TUR', 'Turkey', 345::numeric, 52::numeric, 0.1::numeric, 11),
  ('LENTIL_MASUR', 'IND', 'India', 535::numeric, 30::numeric, 0.05::numeric, 12),
  ('LENTIL_MASUR', 'CAN', 'Canada', 498::numeric, 65::numeric, 0.05::numeric, 13),
  ('LENTIL_MASUR', 'AUS', 'Australia', 510::numeric, 70::numeric, 0.05::numeric, 14),
  ('POTATO', 'IND', 'India', 180::numeric, 18::numeric, 0.05::numeric, 15),
  ('POTATO', 'NLD', 'Netherlands', 220::numeric, 55::numeric, 0.05::numeric, 16),
  ('SUGAR', 'IND', 'India', 520::numeric, 35::numeric, 0.15::numeric, 17),
  ('SUGAR', 'BRA', 'Brazil', 485::numeric, 72::numeric, 0.15::numeric, 18),
  ('SOYBEAN_OIL', 'ARG', 'Argentina', 890::numeric, 68::numeric, 0.12::numeric, 19),
  ('SOYBEAN_OIL', 'MYS', 'Malaysia', 920::numeric, 55::numeric, 0.12::numeric, 20),
  ('COTTON', 'IND', 'India', 1650::numeric, 40::numeric, 0.05::numeric, 21),
  ('COTTON', 'USA', 'United States', 1580::numeric, 85::numeric, 0.05::numeric, 22),
  ('FERTILIZER_Urea', 'CHN', 'China', 310::numeric, 45::numeric, 0.03::numeric, 23),
  ('FERTILIZER_Urea', 'QAT', 'Qatar', 295::numeric, 52::numeric, 0.03::numeric, 24),
  ('JUTE', 'BGD', 'Bangladesh', 680::numeric, 0::numeric, 0.0::numeric, 25)
) AS v(commodity, cc, cn, price, ship, tariff, rank)
WHERE NOT EXISTS (
  SELECT 1 FROM commodity_price_logs WHERE created_at > NOW() - INTERVAL '157 days' AND created_at < NOW() - INTERVAL '151 days' LIMIT 1
);

INSERT INTO commodity_price_logs (commodity_code, country_code, country_name, unit_price_usd, shipping_cost_usd, tariff_rate, landed_cost_usd, source_rank, created_at)
SELECT v.commodity, v.cc, v.cn, v.price + (random() * 20 - 10), v.ship, v.tariff, (v.price + v.ship + v.price * v.tariff) + (random() * 15 - 7), v.rank,
  NOW() - INTERVAL '161 days'
FROM (VALUES
  ('RICE_BR28', 'IND', 'India', 438::numeric, 32::numeric, 0.05::numeric, 1),
  ('RICE_BR28', 'MMR', 'Myanmar', 412::numeric, 45::numeric, 0.05::numeric, 2),
  ('RICE_BR28', 'THA', 'Thailand', 455::numeric, 55::numeric, 0.05::numeric, 3),
  ('RICE_BR28', 'VNM', 'Vietnam', 448::numeric, 50::numeric, 0.05::numeric, 4),
  ('WHEAT', 'IND', 'India', 285::numeric, 28::numeric, 0.08::numeric, 5),
  ('WHEAT', 'PAK', 'Pakistan', 268::numeric, 35::numeric, 0.08::numeric, 6),
  ('WHEAT', 'RUS', 'Russia', 240::numeric, 62::numeric, 0.08::numeric, 7),
  ('WHEAT', 'UKR', 'Ukraine', 252::numeric, 58::numeric, 0.08::numeric, 8),
  ('ONION', 'IND', 'India', 395::numeric, 22::numeric, 0.1::numeric, 9),
  ('ONION', 'EGY', 'Egypt', 360::numeric, 48::numeric, 0.1::numeric, 10),
  ('ONION', 'TUR', 'Turkey', 345::numeric, 52::numeric, 0.1::numeric, 11),
  ('LENTIL_MASUR', 'IND', 'India', 535::numeric, 30::numeric, 0.05::numeric, 12),
  ('LENTIL_MASUR', 'CAN', 'Canada', 498::numeric, 65::numeric, 0.05::numeric, 13),
  ('LENTIL_MASUR', 'AUS', 'Australia', 510::numeric, 70::numeric, 0.05::numeric, 14),
  ('POTATO', 'IND', 'India', 180::numeric, 18::numeric, 0.05::numeric, 15),
  ('POTATO', 'NLD', 'Netherlands', 220::numeric, 55::numeric, 0.05::numeric, 16),
  ('SUGAR', 'IND', 'India', 520::numeric, 35::numeric, 0.15::numeric, 17),
  ('SUGAR', 'BRA', 'Brazil', 485::numeric, 72::numeric, 0.15::numeric, 18),
  ('SOYBEAN_OIL', 'ARG', 'Argentina', 890::numeric, 68::numeric, 0.12::numeric, 19),
  ('SOYBEAN_OIL', 'MYS', 'Malaysia', 920::numeric, 55::numeric, 0.12::numeric, 20),
  ('COTTON', 'IND', 'India', 1650::numeric, 40::numeric, 0.05::numeric, 21),
  ('COTTON', 'USA', 'United States', 1580::numeric, 85::numeric, 0.05::numeric, 22),
  ('FERTILIZER_Urea', 'CHN', 'China', 310::numeric, 45::numeric, 0.03::numeric, 23),
  ('FERTILIZER_Urea', 'QAT', 'Qatar', 295::numeric, 52::numeric, 0.03::numeric, 24),
  ('JUTE', 'BGD', 'Bangladesh', 680::numeric, 0::numeric, 0.0::numeric, 25)
) AS v(commodity, cc, cn, price, ship, tariff, rank)
WHERE NOT EXISTS (
  SELECT 1 FROM commodity_price_logs WHERE created_at > NOW() - INTERVAL '164 days' AND created_at < NOW() - INTERVAL '158 days' LIMIT 1
);

INSERT INTO commodity_price_logs (commodity_code, country_code, country_name, unit_price_usd, shipping_cost_usd, tariff_rate, landed_cost_usd, source_rank, created_at)
SELECT v.commodity, v.cc, v.cn, v.price + (random() * 20 - 10), v.ship, v.tariff, (v.price + v.ship + v.price * v.tariff) + (random() * 15 - 7), v.rank,
  NOW() - INTERVAL '168 days'
FROM (VALUES
  ('RICE_BR28', 'IND', 'India', 438::numeric, 32::numeric, 0.05::numeric, 1),
  ('RICE_BR28', 'MMR', 'Myanmar', 412::numeric, 45::numeric, 0.05::numeric, 2),
  ('RICE_BR28', 'THA', 'Thailand', 455::numeric, 55::numeric, 0.05::numeric, 3),
  ('RICE_BR28', 'VNM', 'Vietnam', 448::numeric, 50::numeric, 0.05::numeric, 4),
  ('WHEAT', 'IND', 'India', 285::numeric, 28::numeric, 0.08::numeric, 5),
  ('WHEAT', 'PAK', 'Pakistan', 268::numeric, 35::numeric, 0.08::numeric, 6),
  ('WHEAT', 'RUS', 'Russia', 240::numeric, 62::numeric, 0.08::numeric, 7),
  ('WHEAT', 'UKR', 'Ukraine', 252::numeric, 58::numeric, 0.08::numeric, 8),
  ('ONION', 'IND', 'India', 395::numeric, 22::numeric, 0.1::numeric, 9),
  ('ONION', 'EGY', 'Egypt', 360::numeric, 48::numeric, 0.1::numeric, 10),
  ('ONION', 'TUR', 'Turkey', 345::numeric, 52::numeric, 0.1::numeric, 11),
  ('LENTIL_MASUR', 'IND', 'India', 535::numeric, 30::numeric, 0.05::numeric, 12),
  ('LENTIL_MASUR', 'CAN', 'Canada', 498::numeric, 65::numeric, 0.05::numeric, 13),
  ('LENTIL_MASUR', 'AUS', 'Australia', 510::numeric, 70::numeric, 0.05::numeric, 14),
  ('POTATO', 'IND', 'India', 180::numeric, 18::numeric, 0.05::numeric, 15),
  ('POTATO', 'NLD', 'Netherlands', 220::numeric, 55::numeric, 0.05::numeric, 16),
  ('SUGAR', 'IND', 'India', 520::numeric, 35::numeric, 0.15::numeric, 17),
  ('SUGAR', 'BRA', 'Brazil', 485::numeric, 72::numeric, 0.15::numeric, 18),
  ('SOYBEAN_OIL', 'ARG', 'Argentina', 890::numeric, 68::numeric, 0.12::numeric, 19),
  ('SOYBEAN_OIL', 'MYS', 'Malaysia', 920::numeric, 55::numeric, 0.12::numeric, 20),
  ('COTTON', 'IND', 'India', 1650::numeric, 40::numeric, 0.05::numeric, 21),
  ('COTTON', 'USA', 'United States', 1580::numeric, 85::numeric, 0.05::numeric, 22),
  ('FERTILIZER_Urea', 'CHN', 'China', 310::numeric, 45::numeric, 0.03::numeric, 23),
  ('FERTILIZER_Urea', 'QAT', 'Qatar', 295::numeric, 52::numeric, 0.03::numeric, 24),
  ('JUTE', 'BGD', 'Bangladesh', 680::numeric, 0::numeric, 0.0::numeric, 25)
) AS v(commodity, cc, cn, price, ship, tariff, rank)
WHERE NOT EXISTS (
  SELECT 1 FROM commodity_price_logs WHERE created_at > NOW() - INTERVAL '171 days' AND created_at < NOW() - INTERVAL '165 days' LIMIT 1
);

INSERT INTO commodity_price_logs (commodity_code, country_code, country_name, unit_price_usd, shipping_cost_usd, tariff_rate, landed_cost_usd, source_rank, created_at)
SELECT v.commodity, v.cc, v.cn, v.price + (random() * 20 - 10), v.ship, v.tariff, (v.price + v.ship + v.price * v.tariff) + (random() * 15 - 7), v.rank,
  NOW() - INTERVAL '175 days'
FROM (VALUES
  ('RICE_BR28', 'IND', 'India', 438::numeric, 32::numeric, 0.05::numeric, 1),
  ('RICE_BR28', 'MMR', 'Myanmar', 412::numeric, 45::numeric, 0.05::numeric, 2),
  ('RICE_BR28', 'THA', 'Thailand', 455::numeric, 55::numeric, 0.05::numeric, 3),
  ('RICE_BR28', 'VNM', 'Vietnam', 448::numeric, 50::numeric, 0.05::numeric, 4),
  ('WHEAT', 'IND', 'India', 285::numeric, 28::numeric, 0.08::numeric, 5),
  ('WHEAT', 'PAK', 'Pakistan', 268::numeric, 35::numeric, 0.08::numeric, 6),
  ('WHEAT', 'RUS', 'Russia', 240::numeric, 62::numeric, 0.08::numeric, 7),
  ('WHEAT', 'UKR', 'Ukraine', 252::numeric, 58::numeric, 0.08::numeric, 8),
  ('ONION', 'IND', 'India', 395::numeric, 22::numeric, 0.1::numeric, 9),
  ('ONION', 'EGY', 'Egypt', 360::numeric, 48::numeric, 0.1::numeric, 10),
  ('ONION', 'TUR', 'Turkey', 345::numeric, 52::numeric, 0.1::numeric, 11),
  ('LENTIL_MASUR', 'IND', 'India', 535::numeric, 30::numeric, 0.05::numeric, 12),
  ('LENTIL_MASUR', 'CAN', 'Canada', 498::numeric, 65::numeric, 0.05::numeric, 13),
  ('LENTIL_MASUR', 'AUS', 'Australia', 510::numeric, 70::numeric, 0.05::numeric, 14),
  ('POTATO', 'IND', 'India', 180::numeric, 18::numeric, 0.05::numeric, 15),
  ('POTATO', 'NLD', 'Netherlands', 220::numeric, 55::numeric, 0.05::numeric, 16),
  ('SUGAR', 'IND', 'India', 520::numeric, 35::numeric, 0.15::numeric, 17),
  ('SUGAR', 'BRA', 'Brazil', 485::numeric, 72::numeric, 0.15::numeric, 18),
  ('SOYBEAN_OIL', 'ARG', 'Argentina', 890::numeric, 68::numeric, 0.12::numeric, 19),
  ('SOYBEAN_OIL', 'MYS', 'Malaysia', 920::numeric, 55::numeric, 0.12::numeric, 20),
  ('COTTON', 'IND', 'India', 1650::numeric, 40::numeric, 0.05::numeric, 21),
  ('COTTON', 'USA', 'United States', 1580::numeric, 85::numeric, 0.05::numeric, 22),
  ('FERTILIZER_Urea', 'CHN', 'China', 310::numeric, 45::numeric, 0.03::numeric, 23),
  ('FERTILIZER_Urea', 'QAT', 'Qatar', 295::numeric, 52::numeric, 0.03::numeric, 24),
  ('JUTE', 'BGD', 'Bangladesh', 680::numeric, 0::numeric, 0.0::numeric, 25)
) AS v(commodity, cc, cn, price, ship, tariff, rank)
WHERE NOT EXISTS (
  SELECT 1 FROM commodity_price_logs WHERE created_at > NOW() - INTERVAL '178 days' AND created_at < NOW() - INTERVAL '172 days' LIMIT 1
);

