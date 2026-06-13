
-- ============================================================
-- Helper function — must exist AFTER organization_members
-- ============================================================
CREATE OR REPLACE FUNCTION auth_user_org_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT organization_id FROM organization_members
  WHERE user_id = auth.uid() AND is_active = TRUE LIMIT 1
$$;

-- ============================================================
-- Enable RLS on all tables
-- ============================================================
ALTER TABLE platform_bootstrap         ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations              ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members       ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE licenses                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_modules       ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions                ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_events              ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE territories                ENABLE ROW LEVEL SECURITY;
ALTER TABLE routes                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE visits                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_templates             ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_submissions           ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflows                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_executions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items            ENABLE ROW LEVEL SECURITY;
ALTER TABLE geometry_features          ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_layers                ENABLE ROW LEVEL SECURITY;
ALTER TABLE vulnerability_assessments  ENABLE ROW LEVEL SECURITY;
ALTER TABLE geographic_levels          ENABLE ROW LEVEL SECURITY;
ALTER TABLE geographic_units           ENABLE ROW LEVEL SECURITY;
ALTER TABLE translation_keys           ENABLE ROW LEVEL SECURITY;
ALTER TABLE translation_values         ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_policies              ENABLE ROW LEVEL SECURITY;
ALTER TABLE retention_policies         ENABLE ROW LEVEL SECURITY;
ALTER TABLE archive_jobs               ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_export_requests       ENABLE ROW LEVEL SECURITY;
ALTER TABLE diagnostic_rules           ENABLE ROW LEVEL SECURITY;
ALTER TABLE diagnostic_results         ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendation_instances   ENABLE ROW LEVEL SECURITY;
ALTER TABLE taxonomy_groups            ENABLE ROW LEVEL SECURITY;
ALTER TABLE taxonomy_items             ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_jobs                ENABLE ROW LEVEL SECURITY;
ALTER TABLE programs                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE indicator_catalog          ENABLE ROW LEVEL SECURITY;
ALTER TABLE indicator_thresholds       ENABLE ROW LEVEL SECURITY;
ALTER TABLE indicator_values           ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_quality_rules         ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_quality_issues        ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_workflows         ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_instances         ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_stage_records     ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence_items             ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_categories       ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_articles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments              ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_index               ENABLE ROW LEVEL SECURITY;
ALTER TABLE observatory_dashboards     ENABLE ROW LEVEL SECURITY;
ALTER TABLE observatory_alerts         ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_queries                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_insights                ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_queue                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE tabulation_configs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE tabulation_results         ENABLE ROW LEVEL SECURITY;
ALTER TABLE score_results              ENABLE ROW LEVEL SECURITY;
ALTER TABLE composite_indexes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE semaphore_rules            ENABLE ROW LEVEL SECURITY;
ALTER TABLE semaphore_results          ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS Policies
-- ============================================================

-- platform_bootstrap
CREATE POLICY "pb_select" ON platform_bootstrap FOR SELECT USING (TRUE);
CREATE POLICY "pb_update" ON platform_bootstrap FOR UPDATE TO authenticated USING (TRUE) WITH CHECK (TRUE);

-- profiles
CREATE POLICY "prof_select"  ON profiles FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "prof_insert"  ON profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "prof_update"  ON profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- organizations
CREATE POLICY "org_select"   ON organizations FOR SELECT TO authenticated USING (id = auth_user_org_id());
CREATE POLICY "org_insert"   ON organizations FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "org_update"   ON organizations FOR UPDATE TO authenticated USING (id = auth_user_org_id()) WITH CHECK (id = auth_user_org_id());

-- organization_members
CREATE POLICY "om_select"    ON organization_members FOR SELECT TO authenticated USING (user_id = auth.uid() OR organization_id = auth_user_org_id());
CREATE POLICY "om_insert"    ON organization_members FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "om_update"    ON organization_members FOR UPDATE TO authenticated USING (organization_id = auth_user_org_id()) WITH CHECK (organization_id = auth_user_org_id());
CREATE POLICY "om_delete"    ON organization_members FOR DELETE TO authenticated USING (organization_id = auth_user_org_id());

-- plans
CREATE POLICY "plans_sel"    ON plans FOR SELECT USING (TRUE);

-- licenses
CREATE POLICY "lic_sel"      ON licenses FOR SELECT TO authenticated USING (organization_id = auth_user_org_id());
CREATE POLICY "lic_ins"      ON licenses FOR INSERT TO authenticated WITH CHECK (organization_id = auth_user_org_id());
CREATE POLICY "lic_upd"      ON licenses FOR UPDATE TO authenticated USING (organization_id = auth_user_org_id()) WITH CHECK (organization_id = auth_user_org_id());
CREATE POLICY "lic_del"      ON licenses FOR DELETE TO authenticated USING (organization_id = auth_user_org_id());

-- modules
CREATE POLICY "mod_sel"      ON modules FOR SELECT USING (TRUE);

-- organization_modules
CREATE POLICY "omod_sel"     ON organization_modules FOR SELECT TO authenticated USING (organization_id = auth_user_org_id());
CREATE POLICY "omod_ins"     ON organization_modules FOR INSERT TO authenticated WITH CHECK (organization_id = auth_user_org_id());
CREATE POLICY "omod_upd"     ON organization_modules FOR UPDATE TO authenticated USING (organization_id = auth_user_org_id()) WITH CHECK (organization_id = auth_user_org_id());
CREATE POLICY "omod_del"     ON organization_modules FOR DELETE TO authenticated USING (organization_id = auth_user_org_id());

-- permissions
CREATE POLICY "perm_sel"     ON permissions FOR SELECT TO authenticated USING (organization_id = auth_user_org_id());
CREATE POLICY "perm_ins"     ON permissions FOR INSERT TO authenticated WITH CHECK (organization_id = auth_user_org_id());
CREATE POLICY "perm_upd"     ON permissions FOR UPDATE TO authenticated USING (organization_id = auth_user_org_id()) WITH CHECK (organization_id = auth_user_org_id());
CREATE POLICY "perm_del"     ON permissions FOR DELETE TO authenticated USING (organization_id = auth_user_org_id());

-- access_events
CREATE POLICY "ae_ins"       ON access_events FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "ae_sel"       ON access_events FOR SELECT TO authenticated USING (user_id = auth.uid());

-- audit_logs
CREATE POLICY "al_sel"       ON audit_logs FOR SELECT TO authenticated USING (organization_id = auth_user_org_id());
CREATE POLICY "al_ins"       ON audit_logs FOR INSERT TO authenticated WITH CHECK (TRUE);

-- territories
CREATE POLICY "ter_sel"      ON territories FOR SELECT TO authenticated USING (organization_id = auth_user_org_id());
CREATE POLICY "ter_ins"      ON territories FOR INSERT TO authenticated WITH CHECK (organization_id = auth_user_org_id());
CREATE POLICY "ter_upd"      ON territories FOR UPDATE TO authenticated USING (organization_id = auth_user_org_id()) WITH CHECK (organization_id = auth_user_org_id());
CREATE POLICY "ter_del"      ON territories FOR DELETE TO authenticated USING (organization_id = auth_user_org_id());

-- routes
CREATE POLICY "rte_sel"      ON routes FOR SELECT TO authenticated USING (organization_id = auth_user_org_id());
CREATE POLICY "rte_ins"      ON routes FOR INSERT TO authenticated WITH CHECK (organization_id = auth_user_org_id());
CREATE POLICY "rte_upd"      ON routes FOR UPDATE TO authenticated USING (organization_id = auth_user_org_id()) WITH CHECK (organization_id = auth_user_org_id());
CREATE POLICY "rte_del"      ON routes FOR DELETE TO authenticated USING (organization_id = auth_user_org_id());

-- visits
CREATE POLICY "vis_sel"      ON visits FOR SELECT TO authenticated USING (organization_id = auth_user_org_id());
CREATE POLICY "vis_ins"      ON visits FOR INSERT TO authenticated WITH CHECK (organization_id = auth_user_org_id());
CREATE POLICY "vis_upd"      ON visits FOR UPDATE TO authenticated USING (organization_id = auth_user_org_id()) WITH CHECK (organization_id = auth_user_org_id());
CREATE POLICY "vis_del"      ON visits FOR DELETE TO authenticated USING (organization_id = auth_user_org_id());

-- form_templates
CREATE POLICY "ftpl_sel"     ON form_templates FOR SELECT TO authenticated USING (organization_id = auth_user_org_id());
CREATE POLICY "ftpl_ins"     ON form_templates FOR INSERT TO authenticated WITH CHECK (organization_id = auth_user_org_id());
CREATE POLICY "ftpl_upd"     ON form_templates FOR UPDATE TO authenticated USING (organization_id = auth_user_org_id()) WITH CHECK (organization_id = auth_user_org_id());
CREATE POLICY "ftpl_del"     ON form_templates FOR DELETE TO authenticated USING (organization_id = auth_user_org_id());

-- form_submissions
CREATE POLICY "fsub_sel"     ON form_submissions FOR SELECT TO authenticated USING (organization_id = auth_user_org_id());
CREATE POLICY "fsub_ins"     ON form_submissions FOR INSERT TO authenticated WITH CHECK (organization_id = auth_user_org_id());
CREATE POLICY "fsub_upd"     ON form_submissions FOR UPDATE TO authenticated USING (organization_id = auth_user_org_id()) WITH CHECK (organization_id = auth_user_org_id());
CREATE POLICY "fsub_del"     ON form_submissions FOR DELETE TO authenticated USING (organization_id = auth_user_org_id());

-- workflows
CREATE POLICY "wf_sel"       ON workflows FOR SELECT TO authenticated USING (organization_id = auth_user_org_id());
CREATE POLICY "wf_ins"       ON workflows FOR INSERT TO authenticated WITH CHECK (organization_id = auth_user_org_id());
CREATE POLICY "wf_upd"       ON workflows FOR UPDATE TO authenticated USING (organization_id = auth_user_org_id()) WITH CHECK (organization_id = auth_user_org_id());
CREATE POLICY "wf_del"       ON workflows FOR DELETE TO authenticated USING (organization_id = auth_user_org_id());

-- workflow_executions
CREATE POLICY "we_sel"       ON workflow_executions FOR SELECT TO authenticated USING (organization_id = auth_user_org_id());
CREATE POLICY "we_ins"       ON workflow_executions FOR INSERT TO authenticated WITH CHECK (organization_id = auth_user_org_id());
CREATE POLICY "we_upd"       ON workflow_executions FOR UPDATE TO authenticated USING (organization_id = auth_user_org_id()) WITH CHECK (organization_id = auth_user_org_id());
CREATE POLICY "we_del"       ON workflow_executions FOR DELETE TO authenticated USING (organization_id = auth_user_org_id());

-- inventory_items
CREATE POLICY "inv_sel"      ON inventory_items FOR SELECT TO authenticated USING (organization_id = auth_user_org_id());
CREATE POLICY "inv_ins"      ON inventory_items FOR INSERT TO authenticated WITH CHECK (organization_id = auth_user_org_id());
CREATE POLICY "inv_upd"      ON inventory_items FOR UPDATE TO authenticated USING (organization_id = auth_user_org_id()) WITH CHECK (organization_id = auth_user_org_id());
CREATE POLICY "inv_del"      ON inventory_items FOR DELETE TO authenticated USING (organization_id = auth_user_org_id());

-- geometry_features
CREATE POLICY "gf_sel"       ON geometry_features FOR SELECT TO authenticated USING (organization_id = auth_user_org_id());
CREATE POLICY "gf_ins"       ON geometry_features FOR INSERT TO authenticated WITH CHECK (organization_id = auth_user_org_id());
CREATE POLICY "gf_upd"       ON geometry_features FOR UPDATE TO authenticated USING (organization_id = auth_user_org_id()) WITH CHECK (organization_id = auth_user_org_id());
CREATE POLICY "gf_del"       ON geometry_features FOR DELETE TO authenticated USING (organization_id = auth_user_org_id());

-- risk_layers
CREATE POLICY "rl_sel"       ON risk_layers FOR SELECT TO authenticated USING (organization_id = auth_user_org_id());
CREATE POLICY "rl_ins"       ON risk_layers FOR INSERT TO authenticated WITH CHECK (organization_id = auth_user_org_id());
CREATE POLICY "rl_upd"       ON risk_layers FOR UPDATE TO authenticated USING (organization_id = auth_user_org_id()) WITH CHECK (organization_id = auth_user_org_id());
CREATE POLICY "rl_del"       ON risk_layers FOR DELETE TO authenticated USING (organization_id = auth_user_org_id());

-- vulnerability_assessments
CREATE POLICY "va_sel"       ON vulnerability_assessments FOR SELECT TO authenticated USING (organization_id = auth_user_org_id());
CREATE POLICY "va_ins"       ON vulnerability_assessments FOR INSERT TO authenticated WITH CHECK (organization_id = auth_user_org_id());
CREATE POLICY "va_upd"       ON vulnerability_assessments FOR UPDATE TO authenticated USING (organization_id = auth_user_org_id()) WITH CHECK (organization_id = auth_user_org_id());
CREATE POLICY "va_del"       ON vulnerability_assessments FOR DELETE TO authenticated USING (organization_id = auth_user_org_id());

-- geographic_levels
CREATE POLICY "gl_sel"       ON geographic_levels FOR SELECT TO authenticated USING (organization_id = auth_user_org_id());
CREATE POLICY "gl_ins"       ON geographic_levels FOR INSERT TO authenticated WITH CHECK (organization_id = auth_user_org_id());
CREATE POLICY "gl_upd"       ON geographic_levels FOR UPDATE TO authenticated USING (organization_id = auth_user_org_id()) WITH CHECK (organization_id = auth_user_org_id());
CREATE POLICY "gl_del"       ON geographic_levels FOR DELETE TO authenticated USING (organization_id = auth_user_org_id());

-- geographic_units
CREATE POLICY "gu_sel"       ON geographic_units FOR SELECT TO authenticated USING (organization_id = auth_user_org_id());
CREATE POLICY "gu_ins"       ON geographic_units FOR INSERT TO authenticated WITH CHECK (organization_id = auth_user_org_id());
CREATE POLICY "gu_upd"       ON geographic_units FOR UPDATE TO authenticated USING (organization_id = auth_user_org_id()) WITH CHECK (organization_id = auth_user_org_id());
CREATE POLICY "gu_del"       ON geographic_units FOR DELETE TO authenticated USING (organization_id = auth_user_org_id());

-- translation_keys / values
CREATE POLICY "tk_sel"       ON translation_keys FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "tk_ins"       ON translation_keys FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "tv_sel"       ON translation_values FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "tv_ins"       ON translation_values FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "tv_upd"       ON translation_values FOR UPDATE TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "tv_del"       ON translation_values FOR DELETE TO authenticated USING (TRUE);

-- data_policies
CREATE POLICY "dp_sel"       ON data_policies FOR SELECT TO authenticated USING (organization_id = auth_user_org_id());
CREATE POLICY "dp_ins"       ON data_policies FOR INSERT TO authenticated WITH CHECK (organization_id = auth_user_org_id());
CREATE POLICY "dp_upd"       ON data_policies FOR UPDATE TO authenticated USING (organization_id = auth_user_org_id()) WITH CHECK (organization_id = auth_user_org_id());
CREATE POLICY "dp_del"       ON data_policies FOR DELETE TO authenticated USING (organization_id = auth_user_org_id());

-- retention_policies
CREATE POLICY "rp_sel"       ON retention_policies FOR SELECT TO authenticated USING (organization_id = auth_user_org_id());
CREATE POLICY "rp_ins"       ON retention_policies FOR INSERT TO authenticated WITH CHECK (organization_id = auth_user_org_id());
CREATE POLICY "rp_upd"       ON retention_policies FOR UPDATE TO authenticated USING (organization_id = auth_user_org_id()) WITH CHECK (organization_id = auth_user_org_id());
CREATE POLICY "rp_del"       ON retention_policies FOR DELETE TO authenticated USING (organization_id = auth_user_org_id());

-- archive_jobs
CREATE POLICY "aj_sel"       ON archive_jobs FOR SELECT TO authenticated USING (organization_id = auth_user_org_id());
CREATE POLICY "aj_ins"       ON archive_jobs FOR INSERT TO authenticated WITH CHECK (organization_id = auth_user_org_id());
CREATE POLICY "aj_upd"       ON archive_jobs FOR UPDATE TO authenticated USING (organization_id = auth_user_org_id()) WITH CHECK (organization_id = auth_user_org_id());
CREATE POLICY "aj_del"       ON archive_jobs FOR DELETE TO authenticated USING (organization_id = auth_user_org_id());

-- data_export_requests
CREATE POLICY "der_sel"      ON data_export_requests FOR SELECT TO authenticated USING (organization_id = auth_user_org_id());
CREATE POLICY "der_ins"      ON data_export_requests FOR INSERT TO authenticated WITH CHECK (organization_id = auth_user_org_id());
CREATE POLICY "der_upd"      ON data_export_requests FOR UPDATE TO authenticated USING (organization_id = auth_user_org_id()) WITH CHECK (organization_id = auth_user_org_id());
CREATE POLICY "der_del"      ON data_export_requests FOR DELETE TO authenticated USING (organization_id = auth_user_org_id());

-- diagnostic_rules
CREATE POLICY "drule_sel"    ON diagnostic_rules FOR SELECT TO authenticated USING (organization_id = auth_user_org_id());
CREATE POLICY "drule_ins"    ON diagnostic_rules FOR INSERT TO authenticated WITH CHECK (organization_id = auth_user_org_id());
CREATE POLICY "drule_upd"    ON diagnostic_rules FOR UPDATE TO authenticated USING (organization_id = auth_user_org_id()) WITH CHECK (organization_id = auth_user_org_id());
CREATE POLICY "drule_del"    ON diagnostic_rules FOR DELETE TO authenticated USING (organization_id = auth_user_org_id());

-- diagnostic_results
CREATE POLICY "dres_sel"     ON diagnostic_results FOR SELECT TO authenticated USING (organization_id = auth_user_org_id());
CREATE POLICY "dres_ins"     ON diagnostic_results FOR INSERT TO authenticated WITH CHECK (organization_id = auth_user_org_id());
CREATE POLICY "dres_upd"     ON diagnostic_results FOR UPDATE TO authenticated USING (organization_id = auth_user_org_id()) WITH CHECK (organization_id = auth_user_org_id());
CREATE POLICY "dres_del"     ON diagnostic_results FOR DELETE TO authenticated USING (organization_id = auth_user_org_id());

-- recommendation_instances
CREATE POLICY "ri_sel"       ON recommendation_instances FOR SELECT TO authenticated USING (organization_id = auth_user_org_id());
CREATE POLICY "ri_ins"       ON recommendation_instances FOR INSERT TO authenticated WITH CHECK (organization_id = auth_user_org_id());
CREATE POLICY "ri_upd"       ON recommendation_instances FOR UPDATE TO authenticated USING (organization_id = auth_user_org_id()) WITH CHECK (organization_id = auth_user_org_id());
CREATE POLICY "ri_del"       ON recommendation_instances FOR DELETE TO authenticated USING (organization_id = auth_user_org_id());

-- taxonomy_groups
CREATE POLICY "tg_sel"       ON taxonomy_groups FOR SELECT TO authenticated USING (organization_id IS NULL OR organization_id = auth_user_org_id());
CREATE POLICY "tg_ins"       ON taxonomy_groups FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "tg_upd"       ON taxonomy_groups FOR UPDATE TO authenticated USING (organization_id = auth_user_org_id()) WITH CHECK (organization_id = auth_user_org_id());
CREATE POLICY "tg_del"       ON taxonomy_groups FOR DELETE TO authenticated USING (organization_id = auth_user_org_id());

-- taxonomy_items
CREATE POLICY "ti_sel"       ON taxonomy_items FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "ti_ins"       ON taxonomy_items FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "ti_upd"       ON taxonomy_items FOR UPDATE TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "ti_del"       ON taxonomy_items FOR DELETE TO authenticated USING (TRUE);

-- import_jobs
CREATE POLICY "ij_sel"       ON import_jobs FOR SELECT TO authenticated USING (organization_id = auth_user_org_id());
CREATE POLICY "ij_ins"       ON import_jobs FOR INSERT TO authenticated WITH CHECK (organization_id = auth_user_org_id());
CREATE POLICY "ij_upd"       ON import_jobs FOR UPDATE TO authenticated USING (organization_id = auth_user_org_id()) WITH CHECK (organization_id = auth_user_org_id());
CREATE POLICY "ij_del"       ON import_jobs FOR DELETE TO authenticated USING (organization_id = auth_user_org_id());

-- programs
CREATE POLICY "prog_sel"     ON programs FOR SELECT TO authenticated USING (organization_id = auth_user_org_id());
CREATE POLICY "prog_ins"     ON programs FOR INSERT TO authenticated WITH CHECK (organization_id = auth_user_org_id());
CREATE POLICY "prog_upd"     ON programs FOR UPDATE TO authenticated USING (organization_id = auth_user_org_id()) WITH CHECK (organization_id = auth_user_org_id());
CREATE POLICY "prog_del"     ON programs FOR DELETE TO authenticated USING (organization_id = auth_user_org_id());

-- projects
CREATE POLICY "proj_sel"     ON projects FOR SELECT TO authenticated USING (organization_id = auth_user_org_id());
CREATE POLICY "proj_ins"     ON projects FOR INSERT TO authenticated WITH CHECK (organization_id = auth_user_org_id());
CREATE POLICY "proj_upd"     ON projects FOR UPDATE TO authenticated USING (organization_id = auth_user_org_id()) WITH CHECK (organization_id = auth_user_org_id());
CREATE POLICY "proj_del"     ON projects FOR DELETE TO authenticated USING (organization_id = auth_user_org_id());

-- activities
CREATE POLICY "act_sel"      ON activities FOR SELECT TO authenticated USING (project_id IN (SELECT id FROM projects WHERE organization_id = auth_user_org_id()));
CREATE POLICY "act_ins"      ON activities FOR INSERT TO authenticated WITH CHECK (project_id IN (SELECT id FROM projects WHERE organization_id = auth_user_org_id()));
CREATE POLICY "act_upd"      ON activities FOR UPDATE TO authenticated USING (project_id IN (SELECT id FROM projects WHERE organization_id = auth_user_org_id())) WITH CHECK (project_id IN (SELECT id FROM projects WHERE organization_id = auth_user_org_id()));
CREATE POLICY "act_del"      ON activities FOR DELETE TO authenticated USING (project_id IN (SELECT id FROM projects WHERE organization_id = auth_user_org_id()));

-- indicator_catalog
CREATE POLICY "ic_sel"       ON indicator_catalog FOR SELECT TO authenticated USING (organization_id IS NULL OR organization_id = auth_user_org_id());
CREATE POLICY "ic_ins"       ON indicator_catalog FOR INSERT TO authenticated WITH CHECK (organization_id = auth_user_org_id());
CREATE POLICY "ic_upd"       ON indicator_catalog FOR UPDATE TO authenticated USING (organization_id = auth_user_org_id()) WITH CHECK (organization_id = auth_user_org_id());
CREATE POLICY "ic_del"       ON indicator_catalog FOR DELETE TO authenticated USING (organization_id = auth_user_org_id());

-- indicator_thresholds
CREATE POLICY "it_sel"       ON indicator_thresholds FOR SELECT TO authenticated USING (organization_id IS NULL OR organization_id = auth_user_org_id());
CREATE POLICY "it_ins"       ON indicator_thresholds FOR INSERT TO authenticated WITH CHECK (organization_id = auth_user_org_id());
CREATE POLICY "it_upd"       ON indicator_thresholds FOR UPDATE TO authenticated USING (organization_id = auth_user_org_id()) WITH CHECK (organization_id = auth_user_org_id());
CREATE POLICY "it_del"       ON indicator_thresholds FOR DELETE TO authenticated USING (organization_id = auth_user_org_id());

-- indicator_values
CREATE POLICY "iv_sel"       ON indicator_values FOR SELECT TO authenticated USING (organization_id = auth_user_org_id());
CREATE POLICY "iv_ins"       ON indicator_values FOR INSERT TO authenticated WITH CHECK (organization_id = auth_user_org_id());
CREATE POLICY "iv_upd"       ON indicator_values FOR UPDATE TO authenticated USING (organization_id = auth_user_org_id()) WITH CHECK (organization_id = auth_user_org_id());
CREATE POLICY "iv_del"       ON indicator_values FOR DELETE TO authenticated USING (organization_id = auth_user_org_id());

-- data_quality_rules
CREATE POLICY "dqr_sel"      ON data_quality_rules FOR SELECT TO authenticated USING (organization_id = auth_user_org_id());
CREATE POLICY "dqr_ins"      ON data_quality_rules FOR INSERT TO authenticated WITH CHECK (organization_id = auth_user_org_id());
CREATE POLICY "dqr_upd"      ON data_quality_rules FOR UPDATE TO authenticated USING (organization_id = auth_user_org_id()) WITH CHECK (organization_id = auth_user_org_id());
CREATE POLICY "dqr_del"      ON data_quality_rules FOR DELETE TO authenticated USING (organization_id = auth_user_org_id());

-- data_quality_issues
CREATE POLICY "dqi_sel"      ON data_quality_issues FOR SELECT TO authenticated USING (organization_id = auth_user_org_id());
CREATE POLICY "dqi_ins"      ON data_quality_issues FOR INSERT TO authenticated WITH CHECK (organization_id = auth_user_org_id());
CREATE POLICY "dqi_upd"      ON data_quality_issues FOR UPDATE TO authenticated USING (organization_id = auth_user_org_id()) WITH CHECK (organization_id = auth_user_org_id());
CREATE POLICY "dqi_del"      ON data_quality_issues FOR DELETE TO authenticated USING (organization_id = auth_user_org_id());

-- approval_workflows
CREATE POLICY "aw_sel"       ON approval_workflows FOR SELECT TO authenticated USING (organization_id = auth_user_org_id());
CREATE POLICY "aw_ins"       ON approval_workflows FOR INSERT TO authenticated WITH CHECK (organization_id = auth_user_org_id());
CREATE POLICY "aw_upd"       ON approval_workflows FOR UPDATE TO authenticated USING (organization_id = auth_user_org_id()) WITH CHECK (organization_id = auth_user_org_id());
CREATE POLICY "aw_del"       ON approval_workflows FOR DELETE TO authenticated USING (organization_id = auth_user_org_id());

-- approval_instances
CREATE POLICY "apinst_sel"   ON approval_instances FOR SELECT TO authenticated USING (organization_id = auth_user_org_id());
CREATE POLICY "apinst_ins"   ON approval_instances FOR INSERT TO authenticated WITH CHECK (organization_id = auth_user_org_id());
CREATE POLICY "apinst_upd"   ON approval_instances FOR UPDATE TO authenticated USING (organization_id = auth_user_org_id()) WITH CHECK (organization_id = auth_user_org_id());
CREATE POLICY "apinst_del"   ON approval_instances FOR DELETE TO authenticated USING (organization_id = auth_user_org_id());

-- approval_stage_records
CREATE POLICY "asr_sel"      ON approval_stage_records FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "asr_ins"      ON approval_stage_records FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "asr_upd"      ON approval_stage_records FOR UPDATE TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "asr_del"      ON approval_stage_records FOR DELETE TO authenticated USING (TRUE);

-- evidence_items
CREATE POLICY "ei_sel"       ON evidence_items FOR SELECT TO authenticated USING (organization_id = auth_user_org_id());
CREATE POLICY "ei_ins"       ON evidence_items FOR INSERT TO authenticated WITH CHECK (organization_id = auth_user_org_id());
CREATE POLICY "ei_upd"       ON evidence_items FOR UPDATE TO authenticated USING (organization_id = auth_user_org_id()) WITH CHECK (organization_id = auth_user_org_id());
CREATE POLICY "ei_del"       ON evidence_items FOR DELETE TO authenticated USING (organization_id = auth_user_org_id());

-- knowledge_categories
CREATE POLICY "kc_sel"       ON knowledge_categories FOR SELECT TO authenticated USING (organization_id = auth_user_org_id());
CREATE POLICY "kc_ins"       ON knowledge_categories FOR INSERT TO authenticated WITH CHECK (organization_id = auth_user_org_id());
CREATE POLICY "kc_upd"       ON knowledge_categories FOR UPDATE TO authenticated USING (organization_id = auth_user_org_id()) WITH CHECK (organization_id = auth_user_org_id());
CREATE POLICY "kc_del"       ON knowledge_categories FOR DELETE TO authenticated USING (organization_id = auth_user_org_id());

-- knowledge_articles
CREATE POLICY "ka_sel"       ON knowledge_articles FOR SELECT TO authenticated USING (organization_id = auth_user_org_id());
CREATE POLICY "ka_ins"       ON knowledge_articles FOR INSERT TO authenticated WITH CHECK (organization_id = auth_user_org_id());
CREATE POLICY "ka_upd"       ON knowledge_articles FOR UPDATE TO authenticated USING (organization_id = auth_user_org_id()) WITH CHECK (organization_id = auth_user_org_id());
CREATE POLICY "ka_del"       ON knowledge_articles FOR DELETE TO authenticated USING (organization_id = auth_user_org_id());

-- tasks
CREATE POLICY "tsk_sel"      ON tasks FOR SELECT TO authenticated USING (organization_id = auth_user_org_id());
CREATE POLICY "tsk_ins"      ON tasks FOR INSERT TO authenticated WITH CHECK (organization_id = auth_user_org_id());
CREATE POLICY "tsk_upd"      ON tasks FOR UPDATE TO authenticated USING (organization_id = auth_user_org_id()) WITH CHECK (organization_id = auth_user_org_id());
CREATE POLICY "tsk_del"      ON tasks FOR DELETE TO authenticated USING (organization_id = auth_user_org_id());

-- task_comments
CREATE POLICY "tc_sel"       ON task_comments FOR SELECT TO authenticated USING (organization_id = auth_user_org_id());
CREATE POLICY "tc_ins"       ON task_comments FOR INSERT TO authenticated WITH CHECK (organization_id = auth_user_org_id());
CREATE POLICY "tc_upd"       ON task_comments FOR UPDATE TO authenticated USING (organization_id = auth_user_org_id()) WITH CHECK (organization_id = auth_user_org_id());
CREATE POLICY "tc_del"       ON task_comments FOR DELETE TO authenticated USING (organization_id = auth_user_org_id());

-- search_index
CREATE POLICY "si_sel"       ON search_index FOR SELECT TO authenticated USING (organization_id = auth_user_org_id());
CREATE POLICY "si_ins"       ON search_index FOR INSERT TO authenticated WITH CHECK (organization_id = auth_user_org_id());
CREATE POLICY "si_upd"       ON search_index FOR UPDATE TO authenticated USING (organization_id = auth_user_org_id()) WITH CHECK (organization_id = auth_user_org_id());
CREATE POLICY "si_del"       ON search_index FOR DELETE TO authenticated USING (organization_id = auth_user_org_id());

-- observatory_dashboards
CREATE POLICY "od_sel"       ON observatory_dashboards FOR SELECT TO authenticated USING (organization_id = auth_user_org_id());
CREATE POLICY "od_ins"       ON observatory_dashboards FOR INSERT TO authenticated WITH CHECK (organization_id = auth_user_org_id());
CREATE POLICY "od_upd"       ON observatory_dashboards FOR UPDATE TO authenticated USING (organization_id = auth_user_org_id()) WITH CHECK (organization_id = auth_user_org_id());
CREATE POLICY "od_del"       ON observatory_dashboards FOR DELETE TO authenticated USING (organization_id = auth_user_org_id());

-- observatory_alerts
CREATE POLICY "oa_sel"       ON observatory_alerts FOR SELECT TO authenticated USING (organization_id = auth_user_org_id());
CREATE POLICY "oa_ins"       ON observatory_alerts FOR INSERT TO authenticated WITH CHECK (organization_id = auth_user_org_id());
CREATE POLICY "oa_upd"       ON observatory_alerts FOR UPDATE TO authenticated USING (organization_id = auth_user_org_id()) WITH CHECK (organization_id = auth_user_org_id());
CREATE POLICY "oa_del"       ON observatory_alerts FOR DELETE TO authenticated USING (organization_id = auth_user_org_id());

-- ai_queries
CREATE POLICY "aiq_sel"      ON ai_queries FOR SELECT TO authenticated USING (organization_id = auth_user_org_id());
CREATE POLICY "aiq_ins"      ON ai_queries FOR INSERT TO authenticated WITH CHECK (organization_id = auth_user_org_id());
CREATE POLICY "aiq_upd"      ON ai_queries FOR UPDATE TO authenticated USING (organization_id = auth_user_org_id()) WITH CHECK (organization_id = auth_user_org_id());
CREATE POLICY "aiq_del"      ON ai_queries FOR DELETE TO authenticated USING (organization_id = auth_user_org_id());

-- ai_insights
CREATE POLICY "aii_sel"      ON ai_insights FOR SELECT TO authenticated USING (organization_id = auth_user_org_id());
CREATE POLICY "aii_ins"      ON ai_insights FOR INSERT TO authenticated WITH CHECK (organization_id = auth_user_org_id());
CREATE POLICY "aii_upd"      ON ai_insights FOR UPDATE TO authenticated USING (organization_id = auth_user_org_id()) WITH CHECK (organization_id = auth_user_org_id());
CREATE POLICY "aii_del"      ON ai_insights FOR DELETE TO authenticated USING (organization_id = auth_user_org_id());

-- sync_queue
CREATE POLICY "sq_sel"       ON sync_queue FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "sq_ins"       ON sync_queue FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "sq_upd"       ON sync_queue FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "sq_del"       ON sync_queue FOR DELETE TO authenticated USING (user_id = auth.uid());

-- tabulation_configs
CREATE POLICY "tcfg_sel"     ON tabulation_configs FOR SELECT TO authenticated USING (organization_id = auth_user_org_id());
CREATE POLICY "tcfg_ins"     ON tabulation_configs FOR INSERT TO authenticated WITH CHECK (organization_id = auth_user_org_id());
CREATE POLICY "tcfg_upd"     ON tabulation_configs FOR UPDATE TO authenticated USING (organization_id = auth_user_org_id()) WITH CHECK (organization_id = auth_user_org_id());
CREATE POLICY "tcfg_del"     ON tabulation_configs FOR DELETE TO authenticated USING (organization_id = auth_user_org_id());

-- tabulation_results
CREATE POLICY "tres_sel"     ON tabulation_results FOR SELECT TO authenticated USING (organization_id = auth_user_org_id());
CREATE POLICY "tres_ins"     ON tabulation_results FOR INSERT TO authenticated WITH CHECK (organization_id = auth_user_org_id());
CREATE POLICY "tres_upd"     ON tabulation_results FOR UPDATE TO authenticated USING (organization_id = auth_user_org_id()) WITH CHECK (organization_id = auth_user_org_id());
CREATE POLICY "tres_del"     ON tabulation_results FOR DELETE TO authenticated USING (organization_id = auth_user_org_id());

-- score_results
CREATE POLICY "sres_sel"     ON score_results FOR SELECT TO authenticated USING (organization_id = auth_user_org_id());
CREATE POLICY "sres_ins"     ON score_results FOR INSERT TO authenticated WITH CHECK (organization_id = auth_user_org_id());
CREATE POLICY "sres_upd"     ON score_results FOR UPDATE TO authenticated USING (organization_id = auth_user_org_id()) WITH CHECK (organization_id = auth_user_org_id());
CREATE POLICY "sres_del"     ON score_results FOR DELETE TO authenticated USING (organization_id = auth_user_org_id());

-- composite_indexes
CREATE POLICY "cidx_sel"     ON composite_indexes FOR SELECT TO authenticated USING (organization_id = auth_user_org_id());
CREATE POLICY "cidx_ins"     ON composite_indexes FOR INSERT TO authenticated WITH CHECK (organization_id = auth_user_org_id());
CREATE POLICY "cidx_upd"     ON composite_indexes FOR UPDATE TO authenticated USING (organization_id = auth_user_org_id()) WITH CHECK (organization_id = auth_user_org_id());
CREATE POLICY "cidx_del"     ON composite_indexes FOR DELETE TO authenticated USING (organization_id = auth_user_org_id());

-- semaphore_rules
CREATE POLICY "srule_sel"    ON semaphore_rules FOR SELECT TO authenticated USING (organization_id = auth_user_org_id());
CREATE POLICY "srule_ins"    ON semaphore_rules FOR INSERT TO authenticated WITH CHECK (organization_id = auth_user_org_id());
CREATE POLICY "srule_upd"    ON semaphore_rules FOR UPDATE TO authenticated USING (organization_id = auth_user_org_id()) WITH CHECK (organization_id = auth_user_org_id());
CREATE POLICY "srule_del"    ON semaphore_rules FOR DELETE TO authenticated USING (organization_id = auth_user_org_id());

-- semaphore_results
CREATE POLICY "sres2_sel"    ON semaphore_results FOR SELECT TO authenticated USING (organization_id = auth_user_org_id());
CREATE POLICY "sres2_ins"    ON semaphore_results FOR INSERT TO authenticated WITH CHECK (organization_id = auth_user_org_id());
CREATE POLICY "sres2_upd"    ON semaphore_results FOR UPDATE TO authenticated USING (organization_id = auth_user_org_id()) WITH CHECK (organization_id = auth_user_org_id());
CREATE POLICY "sres2_del"    ON semaphore_results FOR DELETE TO authenticated USING (organization_id = auth_user_org_id());
