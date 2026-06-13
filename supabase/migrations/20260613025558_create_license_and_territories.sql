-- Create Enterprise license for NODX organization
INSERT INTO licenses (organization_id, plan_id, status, starts_at)
SELECT '61ed2d5a-2625-4b76-937b-a080bd19f2f8', '9001a57e-d0b3-4afb-921e-61d5696eaa40', 'active', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM licenses WHERE organization_id = '61ed2d5a-2625-4b76-937b-a080bd19f2f8'
);

-- Create example territories for NODX organization
INSERT INTO territories (organization_id, name, code, level, level_order, is_active, color)
VALUES
  ('61ed2d5a-2625-4b76-937b-a080bd19f2f8', 'Territorio Central', 'TC-001', 'municipality', 3, true, '#3B82F6'),
  ('61ed2d5a-2625-4b76-937b-a080bd19f2f8', 'Territorio Norte', 'TN-001', 'municipality', 3, true, '#10B981'),
  ('61ed2d5a-2625-4b76-937b-a080bd19f2f8', 'Territorio Sur', 'TS-001', 'municipality', 3, true, '#F59E0B')
ON CONFLICT DO NOTHING;