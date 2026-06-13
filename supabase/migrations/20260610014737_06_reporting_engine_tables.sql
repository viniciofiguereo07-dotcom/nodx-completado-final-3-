
-- Reporting Engine tables
CREATE TABLE IF NOT EXISTS report_templates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  code            TEXT,
  description     TEXT,
  report_type     TEXT NOT NULL DEFAULT 'executive_summary',
  sections        JSONB NOT NULL DEFAULT '[]',
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  is_system       BOOLEAN NOT NULL DEFAULT FALSE,
  created_by      UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS report_instances (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  template_id         UUID REFERENCES report_templates(id),
  name                TEXT NOT NULL,
  report_type         TEXT NOT NULL DEFAULT 'executive_summary',
  status              TEXT NOT NULL DEFAULT 'pending',
  parameters          JSONB NOT NULL DEFAULT '{}',
  sections_data       JSONB NOT NULL DEFAULT '[]',
  summary             TEXT,
  kpi_snapshot        JSONB NOT NULL DEFAULT '{}',
  semaphore_snapshot  JSONB NOT NULL DEFAULT '{}',
  diagnostic_snapshot JSONB NOT NULL DEFAULT '{}',
  tabulation_snapshot JSONB NOT NULL DEFAULT '{}',
  total_sections      INT NOT NULL DEFAULT 0,
  generated_by        UUID,
  generated_at        TIMESTAMPTZ,
  generation_ms       INT,
  error_message       TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS report_distributions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  report_id   UUID NOT NULL REFERENCES report_instances(id) ON DELETE CASCADE,
  recipient   TEXT NOT NULL,
  method      TEXT NOT NULL DEFAULT 'email',
  status      TEXT NOT NULL DEFAULT 'pending',
  sent_at     TIMESTAMPTZ,
  opened_at   TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE report_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_distributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rpt_tmpl_select" ON report_templates FOR SELECT TO authenticated USING (organization_id IS NULL OR is_org_member(organization_id));
CREATE POLICY "rpt_tmpl_insert" ON report_templates FOR INSERT TO authenticated WITH CHECK (is_org_member(organization_id));
CREATE POLICY "rpt_tmpl_update" ON report_templates FOR UPDATE TO authenticated USING (is_org_member(organization_id));
CREATE POLICY "rpt_tmpl_delete" ON report_templates FOR DELETE TO authenticated USING (is_org_member(organization_id));

CREATE POLICY "rpt_inst_select" ON report_instances FOR SELECT TO authenticated USING (is_org_member(organization_id));
CREATE POLICY "rpt_inst_insert" ON report_instances FOR INSERT TO authenticated WITH CHECK (is_org_member(organization_id));
CREATE POLICY "rpt_inst_update" ON report_instances FOR UPDATE TO authenticated USING (is_org_member(organization_id));
CREATE POLICY "rpt_inst_delete" ON report_instances FOR DELETE TO authenticated USING (is_org_member(organization_id));

CREATE POLICY "rpt_dist_select" ON report_distributions FOR SELECT TO authenticated USING (is_org_member(organization_id));
CREATE POLICY "rpt_dist_insert" ON report_distributions FOR INSERT TO authenticated WITH CHECK (is_org_member(organization_id));
CREATE POLICY "rpt_dist_update" ON report_distributions FOR UPDATE TO authenticated USING (is_org_member(organization_id));
CREATE POLICY "rpt_dist_delete" ON report_distributions FOR DELETE TO authenticated USING (is_org_member(organization_id));
