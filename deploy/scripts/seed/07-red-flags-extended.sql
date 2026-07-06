-- Red flag alerts linked to real project names

INSERT INTO red_flag_alerts (id, flag_type, severity, ai_explanation, project_id, created_at)
VALUES
  ('f6000001-0001-4001-8001-000000000001', 'BUDGET_OVERRUN', 4, 'Metro Rail Line-6 expenditure exceeded allocation by 6.8% (IMED Q3 review)', 'e5000001-0001-4001-8001-000000000002', NOW() - INTERVAL '1 days'),
  ('f6000001-0001-4001-8001-000000000002', 'DELAY', 3, 'Rooppur NPP Unit-2 commissioning delayed 8 months vs baseline', 'e5000001-0001-4001-8001-000000000003', NOW() - INTERVAL '2 days'),
  ('f6000001-0001-4001-8001-000000000003', 'BUDGET_OVERRUN', 5, 'Elevated Expressway cost escalation flagged by CAG audit sample', 'e5000001-0001-4001-8001-000000000006', NOW() - INTERVAL '3 days'),
  ('f6000001-0001-4001-8001-000000000004', 'DELAY', 4, 'Matarbari port berth-1 handover slip: 120 days', 'e5000001-0001-4001-8001-000000000005', NOW() - INTERVAL '4 days'),
  ('f6000001-0001-4001-8001-000000000005', 'CORRUPTION_RISK', 4, 'Anomalous vendor concentration on health complex upgrade', 'e5000001-0001-4001-8001-000000000013', NOW() - INTERVAL '5 days'),
  ('f6000001-0001-4001-8001-000000000006', 'CONTRACTOR_FRAUD', 5, 'Duplicate BOQ line items detected — 100 Bridges LGED package', 'e5000001-0001-4001-8001-000000000012', NOW() - INTERVAL '6 days'),
  ('f6000001-0001-4001-8001-000000000007', 'QUALITY', 3, 'Concrete grade non-compliance at Khulna-Mongla rail culvert', 'e5000001-0001-4001-8001-000000000017', NOW() - INTERVAL '7 days'),
  ('f6000001-0001-4001-8001-000000000008', 'DELAY', 5, 'Teesta project stalled — inter-ministerial clearance pending 18 months', 'e5000001-0001-4001-8001-000000000014', NOW() - INTERVAL '8 days'),
  ('f6000001-0001-4001-8001-000000000009', 'BUDGET_OVERRUN', 3, 'Payra port dredging contract 12% above engineer estimate', 'e5000001-0001-4001-8001-000000000007', NOW() - INTERVAL '9 days'),
  ('f6000001-0001-4001-8001-000000000010', 'OTHER', 2, 'Environmental clearance renewal pending — Sonadia feasibility', 'e5000001-0001-4001-8001-000000000011', NOW() - INTERVAL '10 days')
ON CONFLICT (id) DO UPDATE SET ai_explanation = EXCLUDED.ai_explanation, severity = EXCLUDED.severity;
