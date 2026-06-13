
-- Diagnostic Intelligence Engine extended tables
CREATE TABLE IF NOT EXISTS diagnostic_catalog (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  code            TEXT NOT NULL,
  name            TEXT NOT NULL,
  description     TEXT,
  category        TEXT NOT NULL DEFAULT 'data_quality',
  check_type      TEXT NOT NULL DEFAULT 'threshold',
  applies_to_table TEXT NOT NULL,
  condition_rules JSONB NOT NULL DEFAULT '[]',
  default_severity TEXT NOT NULL DEFAULT 'medium',
  default_action  JSONB NOT NULL DEFAULT '{}',
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  is_system       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS diagnostic_findings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  execution_id    UUID,
  rule_id         UUID REFERENCES diagnostic_rules(id),
  catalog_id      UUID REFERENCES diagnostic_catalog(id),
  record_type     TEXT NOT NULL,
  record_id       TEXT,
  finding_type    TEXT NOT NULL DEFAULT 'threshold_violation',
  severity        TEXT NOT NULL DEFAULT 'medium',
  confidence_score NUMERIC NOT NULL DEFAULT 0.5,
  urgency_score   NUMERIC NOT NULL DEFAULT 0.5,
  impact_score    NUMERIC NOT NULL DEFAULT 0.5,
  priority_score  NUMERIC GENERATED ALWAYS AS (confidence_score * urgency_score * impact_score) STORED,
  title           TEXT NOT NULL,
  description     TEXT,
  recommendation  TEXT,
  evidence        JSONB NOT NULL DEFAULT '{}',
  status          TEXT NOT NULL DEFAULT 'open',
  acknowledged_by UUID,
  resolved_by     UUID,
  resolved_at     TIMESTAMPTZ,
  assigned_to     UUID,
  due_date        DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS diagnostic_executions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  execution_type  TEXT NOT NULL DEFAULT 'full',
  status          TEXT NOT NULL DEFAULT 'running',
  rules_evaluated INT NOT NULL DEFAULT 0,
  findings_count  INT NOT NULL DEFAULT 0,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ,
  duration_ms     INT,
  error_message   TEXT,
  triggered_by    UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS recommendation_catalog (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       UUID REFERENCES organizations(id) ON DELETE CASCADE,
  code                  TEXT NOT NULL,
  title                 TEXT NOT NULL,
  description           TEXT,
  trigger_conditions    JSONB NOT NULL DEFAULT '[]',
  recommended_actions   JSONB NOT NULL DEFAULT '[]',
  priority              INT NOT NULL DEFAULT 5,
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  is_system             BOOLEAN NOT NULL DEFAULT FALSE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS recommendation_actions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  recommendation_id   UUID NOT NULL REFERENCES recommendation_instances(id) ON DELETE CASCADE,
  action_label        TEXT NOT NULL,
  action_type         TEXT NOT NULL DEFAULT 'manual',
  payload             JSONB NOT NULL DEFAULT '{}',
  status              TEXT NOT NULL DEFAULT 'pending',
  assigned_to         UUID,
  completed_at        TIMESTAMPTZ,
  completion_notes    TEXT,
  sort_order          INT NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE diagnostic_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE diagnostic_findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE diagnostic_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendation_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendation_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "diag_cat_select" ON diagnostic_catalog FOR SELECT TO authenticated USING (is_org_member(organization_id));
CREATE POLICY "diag_cat_insert" ON diagnostic_catalog FOR INSERT TO authenticated WITH CHECK (is_org_member(organization_id));
CREATE POLICY "diag_cat_update" ON diagnostic_catalog FOR UPDATE TO authenticated USING (is_org_member(organization_id));
CREATE POLICY "diag_cat_delete" ON diagnostic_catalog FOR DELETE TO authenticated USING (is_org_member(organization_id));

CREATE POLICY "diag_findings_select" ON diagnostic_findings FOR SELECT TO authenticated USING (is_org_member(organization_id));
CREATE POLICY "diag_findings_insert" ON diagnostic_findings FOR INSERT TO authenticated WITH CHECK (is_org_member(organization_id));
CREATE POLICY "diag_findings_update" ON diagnostic_findings FOR UPDATE TO authenticated USING (is_org_member(organization_id));
CREATE POLICY "diag_findings_delete" ON diagnostic_findings FOR DELETE TO authenticated USING (is_org_member(organization_id));

CREATE POLICY "diag_exec_select" ON diagnostic_executions FOR SELECT TO authenticated USING (is_org_member(organization_id));
CREATE POLICY "diag_exec_insert" ON diagnostic_executions FOR INSERT TO authenticated WITH CHECK (is_org_member(organization_id));
CREATE POLICY "diag_exec_update" ON diagnostic_executions FOR UPDATE TO authenticated USING (is_org_member(organization_id));
CREATE POLICY "diag_exec_delete" ON diagnostic_executions FOR DELETE TO authenticated USING (is_org_member(organization_id));

CREATE POLICY "rec_cat_select" ON recommendation_catalog FOR SELECT TO authenticated USING (organization_id IS NULL OR is_org_member(organization_id));
CREATE POLICY "rec_cat_insert" ON recommendation_catalog FOR INSERT TO authenticated WITH CHECK (is_org_member(organization_id));
CREATE POLICY "rec_cat_update" ON recommendation_catalog FOR UPDATE TO authenticated USING (is_org_member(organization_id));
CREATE POLICY "rec_cat_delete" ON recommendation_catalog FOR DELETE TO authenticated USING (is_org_member(organization_id));

CREATE POLICY "rec_actions_select" ON recommendation_actions FOR SELECT TO authenticated USING (is_org_member(organization_id));
CREATE POLICY "rec_actions_insert" ON recommendation_actions FOR INSERT TO authenticated WITH CHECK (is_org_member(organization_id));
CREATE POLICY "rec_actions_update" ON recommendation_actions FOR UPDATE TO authenticated USING (is_org_member(organization_id));
CREATE POLICY "rec_actions_delete" ON recommendation_actions FOR DELETE TO authenticated USING (is_org_member(organization_id));
