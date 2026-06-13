-- ============================================================
-- Reporting Engine — new tables
-- ============================================================

-- report_templates: reusable report definitions
CREATE TABLE report_templates (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID REFERENCES organizations(id) ON DELETE CASCADE,
  code              TEXT NOT NULL,
  name              TEXT NOT NULL,
  description       TEXT,
  report_type       TEXT NOT NULL DEFAULT 'executive_summary',
  sections          JSONB NOT NULL DEFAULT '[]',
  parameters        JSONB NOT NULL DEFAULT '{}',
  schedule_cron     TEXT,
  is_system         BOOLEAN NOT NULL DEFAULT FALSE,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_by        UUID,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, code)
);

CREATE INDEX idx_report_templates_org ON report_templates(organization_id);

-- report_instances: generated report records
CREATE TABLE report_instances (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  template_id       UUID REFERENCES report_templates(id) ON DELETE SET NULL,
  name              TEXT NOT NULL,
  report_type       TEXT NOT NULL DEFAULT 'executive_summary',
  status            TEXT NOT NULL DEFAULT 'pending',
  parameters        JSONB NOT NULL DEFAULT '{}',
  sections_data     JSONB NOT NULL DEFAULT '[]',
  summary           TEXT,
  kpi_snapshot      JSONB NOT NULL DEFAULT '{}',
  semaphore_snapshot JSONB NOT NULL DEFAULT '{}',
  diagnostic_snapshot JSONB NOT NULL DEFAULT '{}',
  tabulation_snapshot JSONB NOT NULL DEFAULT '{}',
  total_sections    INT NOT NULL DEFAULT 0,
  generated_at      TIMESTAMPTZ,
  generation_ms     INT,
  error_message     TEXT,
  file_url          TEXT,
  file_format       TEXT,
  expires_at        TIMESTAMPTZ,
  generated_by      UUID,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_report_instances_org    ON report_instances(organization_id);
CREATE INDEX idx_report_instances_status ON report_instances(status);
CREATE INDEX idx_report_instances_type   ON report_instances(report_type);
CREATE INDEX idx_report_instances_gen    ON report_instances(generated_at DESC);

-- report_distributions: who receives reports
CREATE TABLE report_distributions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  report_id         UUID NOT NULL REFERENCES report_instances(id) ON DELETE CASCADE,
  recipient_type    TEXT NOT NULL DEFAULT 'user',
  recipient_id      UUID,
  recipient_email   TEXT,
  status            TEXT NOT NULL DEFAULT 'pending',
  sent_at           TIMESTAMPTZ,
  opened_at         TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_report_distributions_org ON report_distributions(organization_id);
CREATE INDEX idx_report_distributions_rep ON report_distributions(report_id);

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE report_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_distributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_report_templates" ON report_templates FOR SELECT
  TO authenticated USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE));
CREATE POLICY "insert_own_report_templates" ON report_templates FOR INSERT
  TO authenticated WITH CHECK (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE));
CREATE POLICY "update_own_report_templates" ON report_templates FOR UPDATE
  TO authenticated USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE))
  WITH CHECK (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE));
CREATE POLICY "delete_own_report_templates" ON report_templates FOR DELETE
  TO authenticated USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE));

CREATE POLICY "select_own_report_instances" ON report_instances FOR SELECT
  TO authenticated USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE));
CREATE POLICY "insert_own_report_instances" ON report_instances FOR INSERT
  TO authenticated WITH CHECK (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE));
CREATE POLICY "update_own_report_instances" ON report_instances FOR UPDATE
  TO authenticated USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE))
  WITH CHECK (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE));
CREATE POLICY "delete_own_report_instances" ON report_instances FOR DELETE
  TO authenticated USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE));

CREATE POLICY "select_own_report_distributions" ON report_distributions FOR SELECT
  TO authenticated USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE));
CREATE POLICY "insert_own_report_distributions" ON report_distributions FOR INSERT
  TO authenticated WITH CHECK (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE));
CREATE POLICY "update_own_report_distributions" ON report_distributions FOR UPDATE
  TO authenticated USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE))
  WITH CHECK (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE));
CREATE POLICY "delete_own_report_distributions" ON report_distributions FOR DELETE
  TO authenticated USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE));