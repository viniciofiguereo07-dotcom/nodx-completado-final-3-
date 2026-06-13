-- ============================================================
-- Diagnostic Intelligence Engine — new tables
-- ============================================================

-- diagnostic_catalog: repository of reusable diagnostic checks
CREATE TABLE diagnostic_catalog (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  code              TEXT NOT NULL,
  name              TEXT NOT NULL,
  description       TEXT,
  category          TEXT NOT NULL DEFAULT 'custom',
  check_type        TEXT NOT NULL DEFAULT 'threshold',
  applies_to_table  TEXT NOT NULL,
  condition_rules   JSONB NOT NULL DEFAULT '[]',
  default_severity  TEXT NOT NULL DEFAULT 'medium',
  default_action    JSONB NOT NULL DEFAULT '{}',
  parameters        JSONB NOT NULL DEFAULT '{}',
  is_system         BOOLEAN NOT NULL DEFAULT FALSE,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, code)
);

CREATE INDEX idx_diagnostic_catalog_org ON diagnostic_catalog(organization_id);
CREATE INDEX idx_diagnostic_catalog_code ON diagnostic_catalog(code);

-- diagnostic_executions: tracks each run of the diagnostic engine
CREATE TABLE diagnostic_executions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  execution_type    TEXT NOT NULL DEFAULT 'full',
  status            TEXT NOT NULL DEFAULT 'pending',
  rules_evaluated   INT NOT NULL DEFAULT 0,
  findings_count    INT NOT NULL DEFAULT 0,
  started_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at      TIMESTAMPTZ,
  duration_ms       INT,
  error_message     TEXT,
  metadata          JSONB NOT NULL DEFAULT '{}',
  triggered_by      UUID,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_diagnostic_executions_org   ON diagnostic_executions(organization_id);
CREATE INDEX idx_diagnostic_executions_status ON diagnostic_executions(status);
CREATE INDEX idx_diagnostic_executions_start  ON diagnostic_executions(started_at DESC);

-- diagnostic_findings: richer findings with scoring (extends diagnostic_results concept)
CREATE TABLE diagnostic_findings (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  execution_id      UUID REFERENCES diagnostic_executions(id) ON DELETE SET NULL,
  rule_id           UUID REFERENCES diagnostic_rules(id) ON DELETE SET NULL,
  catalog_id        UUID REFERENCES diagnostic_catalog(id) ON DELETE SET NULL,
  record_type       TEXT NOT NULL,
  record_id         TEXT,
  finding_type      TEXT NOT NULL DEFAULT 'threshold_violation',
  severity          TEXT NOT NULL DEFAULT 'medium',
  confidence_score  NUMERIC NOT NULL DEFAULT 0.5,
  urgency_score     NUMERIC NOT NULL DEFAULT 0.5,
  impact_score      NUMERIC NOT NULL DEFAULT 0.5,
  priority_score    NUMERIC GENERATED ALWAYS AS (
    ROUND((CASE WHEN severity = 'critical' THEN 1.0 WHEN severity = 'high' THEN 0.8 WHEN severity = 'medium' THEN 0.6 WHEN severity = 'low' THEN 0.4 ELSE 0.2 END) * confidence_score * urgency_score * impact_score, 4)
  ) STORED,
  title             TEXT NOT NULL,
  description       TEXT,
  recommendation    TEXT,
  evidence          JSONB NOT NULL DEFAULT '{}',
  status            TEXT NOT NULL DEFAULT 'open',
  acknowledged_by   UUID,
  resolved_by       UUID,
  resolved_at       TIMESTAMPTZ,
  assigned_to       UUID,
  due_date          TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_diagnostic_findings_org      ON diagnostic_findings(organization_id);
CREATE INDEX idx_diagnostic_findings_execution ON diagnostic_findings(execution_id);
CREATE INDEX idx_diagnostic_findings_rule     ON diagnostic_findings(rule_id);
CREATE INDEX idx_diagnostic_findings_status   ON diagnostic_findings(status);
CREATE INDEX idx_diagnostic_findings_severity ON diagnostic_findings(severity);
CREATE INDEX idx_diagnostic_findings_priority ON diagnostic_findings(priority_score DESC);
CREATE INDEX idx_diagnostic_findings_type     ON diagnostic_findings(finding_type);

-- recommendation_catalog: reusable recommendation templates
CREATE TABLE recommendation_catalog (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id      UUID REFERENCES organizations(id) ON DELETE CASCADE,
  code                 TEXT NOT NULL,
  title                TEXT NOT NULL,
  description          TEXT,
  sector               TEXT,
  trigger_conditions   JSONB NOT NULL DEFAULT '[]',
  recommended_actions  JSONB NOT NULL DEFAULT '[]',
  priority             INT NOT NULL DEFAULT 5,
  estimated_effort     TEXT,
  tags                 TEXT[] NOT NULL DEFAULT '{}',
  is_system            BOOLEAN NOT NULL DEFAULT FALSE,
  is_active            BOOLEAN NOT NULL DEFAULT TRUE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, code)
);

CREATE INDEX idx_recommendation_catalog_org  ON recommendation_catalog(organization_id);
CREATE INDEX idx_recommendation_catalog_code ON recommendation_catalog(code);

-- recommendation_actions: individual action items linked to recommendation instances
CREATE TABLE recommendation_actions (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  recommendation_id        UUID NOT NULL REFERENCES recommendation_instances(id) ON DELETE CASCADE,
  action_label             TEXT NOT NULL,
  action_type              TEXT NOT NULL DEFAULT 'manual',
  payload                  JSONB NOT NULL DEFAULT '{}',
  status                   TEXT NOT NULL DEFAULT 'pending',
  assigned_to              UUID,
  completed_at             TIMESTAMPTZ,
  completion_notes         TEXT,
  sort_order               INT NOT NULL DEFAULT 0,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_recommendation_actions_org   ON recommendation_actions(organization_id);
CREATE INDEX idx_recommendation_actions_rec   ON recommendation_actions(recommendation_id);
CREATE INDEX idx_recommendation_actions_status ON recommendation_actions(status);

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE diagnostic_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE diagnostic_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE diagnostic_findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendation_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendation_actions ENABLE ROW LEVEL SECURITY;

-- diagnostic_catalog policies
CREATE POLICY "select_own_diagnostic_catalog" ON diagnostic_catalog FOR SELECT
  TO authenticated USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE));
CREATE POLICY "insert_own_diagnostic_catalog" ON diagnostic_catalog FOR INSERT
  TO authenticated WITH CHECK (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE));
CREATE POLICY "update_own_diagnostic_catalog" ON diagnostic_catalog FOR UPDATE
  TO authenticated USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE))
  WITH CHECK (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE));
CREATE POLICY "delete_own_diagnostic_catalog" ON diagnostic_catalog FOR DELETE
  TO authenticated USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE));

-- diagnostic_executions policies
CREATE POLICY "select_own_diagnostic_executions" ON diagnostic_executions FOR SELECT
  TO authenticated USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE));
CREATE POLICY "insert_own_diagnostic_executions" ON diagnostic_executions FOR INSERT
  TO authenticated WITH CHECK (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE));
CREATE POLICY "update_own_diagnostic_executions" ON diagnostic_executions FOR UPDATE
  TO authenticated USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE))
  WITH CHECK (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE));
CREATE POLICY "delete_own_diagnostic_executions" ON diagnostic_executions FOR DELETE
  TO authenticated USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE));

-- diagnostic_findings policies
CREATE POLICY "select_own_diagnostic_findings" ON diagnostic_findings FOR SELECT
  TO authenticated USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE));
CREATE POLICY "insert_own_diagnostic_findings" ON diagnostic_findings FOR INSERT
  TO authenticated WITH CHECK (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE));
CREATE POLICY "update_own_diagnostic_findings" ON diagnostic_findings FOR UPDATE
  TO authenticated USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE))
  WITH CHECK (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE));
CREATE POLICY "delete_own_diagnostic_findings" ON diagnostic_findings FOR DELETE
  TO authenticated USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE));

-- recommendation_catalog policies
CREATE POLICY "select_own_recommendation_catalog" ON recommendation_catalog FOR SELECT
  TO authenticated USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE));
CREATE POLICY "insert_own_recommendation_catalog" ON recommendation_catalog FOR INSERT
  TO authenticated WITH CHECK (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE));
CREATE POLICY "update_own_recommendation_catalog" ON recommendation_catalog FOR UPDATE
  TO authenticated USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE))
  WITH CHECK (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE));
CREATE POLICY "delete_own_recommendation_catalog" ON recommendation_catalog FOR DELETE
  TO authenticated USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE));

-- recommendation_actions policies
CREATE POLICY "select_own_recommendation_actions" ON recommendation_actions FOR SELECT
  TO authenticated USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE));
CREATE POLICY "insert_own_recommendation_actions" ON recommendation_actions FOR INSERT
  TO authenticated WITH CHECK (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE));
CREATE POLICY "update_own_recommendation_actions" ON recommendation_actions FOR UPDATE
  TO authenticated USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE))
  WITH CHECK (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE));
CREATE POLICY "delete_own_recommendation_actions" ON recommendation_actions FOR DELETE
  TO authenticated USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE));
