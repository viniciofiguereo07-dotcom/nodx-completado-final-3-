
-- ============================================================
-- RLS Policies — authenticated users scoped to their org
-- ============================================================

-- Profiles: users can read own profile
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_delete_own" ON profiles FOR DELETE TO authenticated USING (auth.uid() = id);

-- platform_bootstrap: public read (needed before login)
ALTER TABLE platform_bootstrap ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bootstrap_select_all" ON platform_bootstrap FOR SELECT USING (true);
CREATE POLICY "bootstrap_update_auth" ON platform_bootstrap FOR UPDATE TO authenticated USING (true);

-- organizations: members can read their org
CREATE POLICY "orgs_select" ON organizations FOR SELECT TO authenticated USING (
  id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = true)
);
CREATE POLICY "orgs_insert" ON organizations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "orgs_update" ON organizations FOR UPDATE TO authenticated USING (
  id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = true AND role IN ('super_admin','org_admin'))
);
CREATE POLICY "orgs_delete" ON organizations FOR DELETE TO authenticated USING (false);

-- organization_members
CREATE POLICY "members_select" ON organization_members FOR SELECT TO authenticated USING (
  organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = true)
);
CREATE POLICY "members_insert" ON organization_members FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "members_update" ON organization_members FOR UPDATE TO authenticated USING (
  organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = true AND role IN ('super_admin','org_admin'))
);
CREATE POLICY "members_delete" ON organization_members FOR DELETE TO authenticated USING (
  organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = true AND role IN ('super_admin','org_admin'))
);

-- Helper function to check org membership
CREATE OR REPLACE FUNCTION is_org_member(org_id UUID)
RETURNS BOOLEAN LANGUAGE SQL SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = org_id AND user_id = auth.uid() AND is_active = true
  );
$$;

-- Generic org-scoped policy macro for tables with organization_id
DO $$ 
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'territories','routes','visits','form_templates','form_submissions',
    'inventory_items','sync_queue','workflows','workflow_executions',
    'ai_queries','ai_insights','geometry_features','risk_layers',
    'households','vulnerability_assessments',
    'indicator_values','diagnostic_rules','diagnostic_results',
    'recommendation_instances','semaphore_rules','semaphore_results',
    'tabulation_configs','tabulation_results','score_results','composite_indexes',
    'data_policies','retention_policies','archive_jobs','data_export_requests',
    'search_index','data_quality_rules','data_quality_issues',
    'approval_workflows','approval_instances','approval_stage_records',
    'evidence_items','knowledge_categories','knowledge_articles',
    'tasks','task_comments','observatory_dashboards','observatory_alerts',
    'import_jobs','audit_logs','access_events',
    'organization_modules','licenses'
  ];
BEGIN
  FOREACH t IN ARRAY tables
  LOOP
    EXECUTE format('
      CREATE POLICY "%s_select" ON %I FOR SELECT TO authenticated USING (is_org_member(organization_id));
      CREATE POLICY "%s_insert" ON %I FOR INSERT TO authenticated WITH CHECK (is_org_member(organization_id));
      CREATE POLICY "%s_update" ON %I FOR UPDATE TO authenticated USING (is_org_member(organization_id)) WITH CHECK (is_org_member(organization_id));
      CREATE POLICY "%s_delete" ON %I FOR DELETE TO authenticated USING (is_org_member(organization_id));
    ', t, t, t, t, t, t, t, t);
  END LOOP;
END $$;

-- programs, projects, activities use org_id
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION get_user_org_id() RETURNS UUID LANGUAGE SQL SECURITY DEFINER AS $$
  SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = true LIMIT 1;
$$;

CREATE POLICY "programs_select" ON programs FOR SELECT TO authenticated USING (org_id = get_user_org_id());
CREATE POLICY "programs_insert" ON programs FOR INSERT TO authenticated WITH CHECK (org_id = get_user_org_id());
CREATE POLICY "programs_update" ON programs FOR UPDATE TO authenticated USING (org_id = get_user_org_id()) WITH CHECK (org_id = get_user_org_id());
CREATE POLICY "programs_delete" ON programs FOR DELETE TO authenticated USING (org_id = get_user_org_id());

CREATE POLICY "projects_select" ON projects FOR SELECT TO authenticated USING (org_id = get_user_org_id());
CREATE POLICY "projects_insert" ON projects FOR INSERT TO authenticated WITH CHECK (org_id = get_user_org_id());
CREATE POLICY "projects_update" ON projects FOR UPDATE TO authenticated USING (org_id = get_user_org_id()) WITH CHECK (org_id = get_user_org_id());
CREATE POLICY "projects_delete" ON projects FOR DELETE TO authenticated USING (org_id = get_user_org_id());

CREATE POLICY "activities_select" ON activities FOR SELECT TO authenticated USING (org_id = get_user_org_id());
CREATE POLICY "activities_insert" ON activities FOR INSERT TO authenticated WITH CHECK (org_id = get_user_org_id());
CREATE POLICY "activities_update" ON activities FOR UPDATE TO authenticated USING (org_id = get_user_org_id()) WITH CHECK (org_id = get_user_org_id());
CREATE POLICY "activities_delete" ON activities FOR DELETE TO authenticated USING (org_id = get_user_org_id());

-- indicator_catalog: system indicators (org_id IS NULL) readable by all, org ones scoped
ALTER TABLE indicator_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE indicator_thresholds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "indicator_catalog_select" ON indicator_catalog FOR SELECT TO authenticated USING (org_id IS NULL OR org_id = get_user_org_id());
CREATE POLICY "indicator_catalog_insert" ON indicator_catalog FOR INSERT TO authenticated WITH CHECK (org_id = get_user_org_id());
CREATE POLICY "indicator_catalog_update" ON indicator_catalog FOR UPDATE TO authenticated USING (org_id = get_user_org_id()) WITH CHECK (org_id = get_user_org_id());
CREATE POLICY "indicator_catalog_delete" ON indicator_catalog FOR DELETE TO authenticated USING (org_id = get_user_org_id());

CREATE POLICY "indicator_thresholds_select" ON indicator_thresholds FOR SELECT TO authenticated USING (org_id IS NULL OR org_id = get_user_org_id());
CREATE POLICY "indicator_thresholds_insert" ON indicator_thresholds FOR INSERT TO authenticated WITH CHECK (org_id = get_user_org_id());
CREATE POLICY "indicator_thresholds_update" ON indicator_thresholds FOR UPDATE TO authenticated USING (org_id = get_user_org_id()) WITH CHECK (org_id = get_user_org_id());
CREATE POLICY "indicator_thresholds_delete" ON indicator_thresholds FOR DELETE TO authenticated USING (org_id = get_user_org_id());

-- Global tables (no org scope)
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE geographic_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE geographic_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE translation_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE translation_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE taxonomy_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE taxonomy_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plans_select" ON plans FOR SELECT USING (true);
CREATE POLICY "modules_select" ON modules FOR SELECT USING (true);
CREATE POLICY "permissions_select" ON permissions FOR SELECT USING (true);
CREATE POLICY "geo_levels_select" ON geographic_levels FOR SELECT USING (true);
CREATE POLICY "geo_units_select" ON geographic_units FOR SELECT USING (true);
CREATE POLICY "translation_keys_select" ON translation_keys FOR SELECT USING (true);
CREATE POLICY "translation_values_select" ON translation_values FOR SELECT USING (true);
CREATE POLICY "taxonomy_groups_select" ON taxonomy_groups FOR SELECT USING (true);
CREATE POLICY "taxonomy_items_select" ON taxonomy_items FOR SELECT USING (true);
