
-- ============================================================
-- Seed: Plans, Modules, Permissions, Geographic levels
-- ============================================================

-- Plans
INSERT INTO plans (name, description, max_members, max_devices, max_territories, max_storage_gb, included_modules) VALUES
('Starter',    'Small teams',           5,   5,   10,  5,   ARRAY['dashboard','territories','routes','visits','forms','analytics']),
('Professional','Growing organizations',25,  25,  100, 50,  ARRAY['dashboard','territories','routes','visits','forms','analytics','ai','sync','inventory','workflows','audit']),
('Enterprise', 'Full platform access',  999, 999, 999, 999, ARRAY['dashboard','territories','routes','visits','forms','geospatial','workflows','analytics','ai','sync','permissions','licensing','inventory','audit','iam','households','wash','me_indicators','indicator_dashboard','score_dashboard','semaphore','historical_trends','bulk_import','geographic_hierarchy','i18n','data_governance','diagnostics','humanitarian_taxonomy','projects','indicator_catalog','data_quality','approval_workflow','evidence_management','knowledge_library','tasks','global_search','observatory','ai_analyst','reporting','alerts'])
ON CONFLICT DO NOTHING;

-- Modules
INSERT INTO modules (key, name, description, is_core) VALUES
('dashboard',              'Dashboard',              'Operations overview',             TRUE),
('territories',            'Territories',            'Territory hierarchy management',   FALSE),
('routes',                 'Routes',                 'Route builder',                    FALSE),
('visits',                 'Visits',                 'Visit tracking',                   FALSE),
('forms',                  'Forms Engine',           'Smart form builder',               FALSE),
('geospatial',             'Geospatial Engine',      'Maps and geometry',                FALSE),
('geometry',               'Geometry',               'Geometry features',                FALSE),
('risk_mapping',           'Risk Mapping',           'Risk and vulnerability layers',    FALSE),
('workflows',              'Workflows',              'Process automation',               FALSE),
('analytics',              'Analytics',              'Operational analytics',            FALSE),
('ai',                     'AI Engine',              'AI query engine',                  FALSE),
('inventory',              'Inventory',              'Stock management',                 FALSE),
('households',             'Households',             'Household registry',               FALSE),
('wash',                   'WASH',                   'Water, sanitation, hygiene',       FALSE),
('me_indicators',          'M&E Indicators',         'Indicators catalog',               FALSE),
('indicator_dashboard',    'Indicator Dashboard',    'KPI dashboard',                    FALSE),
('score_dashboard',        'Score Dashboard',        'Tabulation scores',                FALSE),
('semaphore',              'Semaphore',              'Traffic light monitoring',         FALSE),
('historical_trends',      'Historical Trends',      'Trend analysis',                   FALSE),
('bulk_import',            'Bulk Import',            'Data import engine',               FALSE),
('geographic_hierarchy',   'Geographic Hierarchy',   'Geographic levels and units',      FALSE),
('i18n',                   'Multilingual',           'Translation management',           FALSE),
('data_governance',        'Data Governance',        'Retention and policies',           FALSE),
('diagnostics',            'Diagnostics',            'Data quality diagnostics',         FALSE),
('humanitarian_taxonomy',  'Taxonomy',               'Humanitarian classification',      FALSE),
('projects',               'Projects',               'Project management',               FALSE),
('indicator_catalog',      'Indicator Catalog',      'Universal indicator catalog',      FALSE),
('data_quality',           'Data Quality',           'Quality checks',                   FALSE),
('approval_workflow',      'Approvals',              'Multi-stage approvals',            FALSE),
('evidence_management',    'Evidence',               'Evidence capture',                 FALSE),
('knowledge_library',      'Knowledge',              'Knowledge base',                   FALSE),
('tasks',                  'Tasks',                  'Task management',                  FALSE),
('global_search',          'Global Search',          'Cross-platform search',            FALSE),
('observatory',            'Observatory',            'Territorial observatory',          FALSE),
('ai_analyst',             'AI Analyst',             'AI analyst assistant',             FALSE),
('reporting',              'Reporting',              'Report generation',                FALSE),
('alerts',                 'Alerts',                 'Alert engine',                     FALSE),
('sync',                   'Sync Engine',            'Offline sync',                     FALSE),
('audit',                  'Audit',                  'Audit logs',                       FALSE),
('permissions',            'Permissions',            'Access control',                   TRUE),
('licensing',              'Licensing',              'License management',               TRUE),
('iam',                    'IAM',                    'Identity management',              TRUE)
ON CONFLICT (key) DO NOTHING;

-- Permissions
INSERT INTO permissions (module, name, key) VALUES
('territories', 'View territories', 'territories.view'),
('territories', 'Create territory', 'territories.create'),
('territories', 'Edit territory', 'territories.edit'),
('territories', 'Delete territory', 'territories.delete'),
('routes', 'View routes', 'routes.view'),
('routes', 'Create route', 'routes.create'),
('routes', 'Edit route', 'routes.edit'),
('routes', 'Delete route', 'routes.delete'),
('visits', 'View visits', 'visits.view'),
('visits', 'Create visit', 'visits.create'),
('visits', 'Edit visit', 'visits.edit'),
('visits', 'Delete visit', 'visits.delete'),
('forms', 'View forms', 'forms.view'),
('forms', 'Create form', 'forms.create'),
('forms', 'Edit form', 'forms.edit'),
('forms', 'Delete form', 'forms.delete'),
('forms', 'Submit form', 'forms.submit'),
('forms', 'Review form', 'forms.review'),
('analytics', 'View analytics', 'analytics.view'),
('analytics', 'Export analytics', 'analytics.export'),
('members', 'View members', 'members.view'),
('members', 'Manage members', 'members.manage'),
('inventory', 'View inventory', 'inventory.view'),
('inventory', 'Transact inventory', 'inventory.transact'),
('audit', 'View audit log', 'audit.view'),
('ai', 'Query AI', 'ai.query'),
('workflows', 'View workflows', 'workflows.view'),
('workflows', 'Create workflow', 'workflows.create'),
('workflows', 'Execute workflow', 'workflows.execute'),
('devices', 'View devices', 'devices.view'),
('devices', 'Manage devices', 'devices.manage')
ON CONFLICT (key) DO NOTHING;

-- Geographic levels
INSERT INTO geographic_levels (code, name, rank, is_system) VALUES
('country',      'Country',      0, TRUE),
('region',       'Region',       1, TRUE),
('province',     'Province',     2, TRUE),
('municipality', 'Municipality', 3, TRUE),
('district',     'District',     4, TRUE),
('section',      'Section',      5, TRUE),
('locality',     'Locality',     6, FALSE)
ON CONFLICT (code) DO NOTHING;

-- Taxonomy groups
INSERT INTO taxonomy_groups (id, name, sector, is_system) VALUES
(gen_random_uuid(), 'Water Source Types',       'WASH',          TRUE),
(gen_random_uuid(), 'Sanitation Types',          'WASH',          TRUE),
(gen_random_uuid(), 'Food Security Categories',  'Food Security', TRUE),
(gen_random_uuid(), 'Nutrition Status',          'Nutrition',     TRUE),
(gen_random_uuid(), 'Protection Categories',     'Protection',    TRUE),
(gen_random_uuid(), 'Displacement Status',       'Protection',    TRUE),
(gen_random_uuid(), 'Education Levels',          'Education',     TRUE),
(gen_random_uuid(), 'Health Facility Types',     'Health',        TRUE),
(gen_random_uuid(), 'Livelihood Categories',     'Livelihoods',   TRUE),
(gen_random_uuid(), 'M&E Data Sources',          'M&E',           TRUE)
ON CONFLICT DO NOTHING;
