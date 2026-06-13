
INSERT INTO permissions (module, name, key) VALUES
('territories','View territories','territories.view'),
('territories','Create territory','territories.create'),
('territories','Edit territory','territories.edit'),
('territories','Delete territory','territories.delete'),
('routes','View routes','routes.view'),
('routes','Create route','routes.create'),
('routes','Edit route','routes.edit'),
('routes','Delete route','routes.delete'),
('visits','View visits','visits.view'),
('visits','Create visit','visits.create'),
('visits','Edit visit','visits.edit'),
('visits','Delete visit','visits.delete'),
('forms','View forms','forms.view'),
('forms','Create form','forms.create'),
('forms','Edit form','forms.edit'),
('forms','Delete form','forms.delete'),
('forms','Submit form','forms.submit'),
('forms','Review form','forms.review'),
('analytics','View analytics','analytics.view'),
('analytics','Export analytics','analytics.export'),
('members','View members','members.view'),
('members','Manage members','members.manage'),
('inventory','View inventory','inventory.view'),
('inventory','Transact inventory','inventory.transact'),
('audit','View audit log','audit.view'),
('ai','Query AI','ai.query'),
('workflows','View workflows','workflows.view'),
('workflows','Create workflow','workflows.create'),
('workflows','Execute workflow','workflows.execute'),
('devices','View devices','devices.view'),
('devices','Manage devices','devices.manage')
ON CONFLICT (key) DO NOTHING;

INSERT INTO geographic_levels (code, name, rank, is_system) VALUES
('country','Country',0,TRUE),
('region','Region',1,TRUE),
('province','Province',2,TRUE),
('municipality','Municipality',3,TRUE),
('district','District',4,TRUE),
('section','Section',5,TRUE),
('locality','Locality',6,FALSE)
ON CONFLICT (code) DO NOTHING;
