-- ============================================================
-- Alert Engine — new tables
-- ============================================================

CREATE TABLE alert_rules (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  code              TEXT NOT NULL,
  name              TEXT NOT NULL,
  description       TEXT,
  alert_type        TEXT NOT NULL DEFAULT 'threshold',
  source_engine     TEXT NOT NULL DEFAULT 'indicator',
  severity          TEXT NOT NULL DEFAULT 'medium',
  priority          INT NOT NULL DEFAULT 5,
  conditions        JSONB NOT NULL DEFAULT '[]',
  cooldown_minutes  INT NOT NULL DEFAULT 60,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  last_triggered_at TIMESTAMPTZ,
  created_by        UUID,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, code)
);

CREATE INDEX idx_alert_rules_org ON alert_rules(organization_id);
CREATE INDEX idx_alert_rules_source ON alert_rules(source_engine);
CREATE INDEX idx_alert_rules_active ON alert_rules(is_active);

CREATE TABLE alert_events (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  rule_id           UUID REFERENCES alert_rules(id) ON DELETE SET NULL,
  source_engine     TEXT NOT NULL,
  source_type       TEXT,
  source_id         TEXT,
  severity          TEXT NOT NULL DEFAULT 'medium',
  title             TEXT NOT NULL,
  description       TEXT,
  evidence          JSONB NOT NULL DEFAULT '{}',
  status            TEXT NOT NULL DEFAULT 'active',
  acknowledged_by   UUID,
  acknowledged_at   TIMESTAMPTZ,
  resolved_by       UUID,
  resolved_at       TIMESTAMPTZ,
  resolution_notes  TEXT,
  dismissed_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_alert_events_org ON alert_events(organization_id);
CREATE INDEX idx_alert_events_status ON alert_events(status);
CREATE INDEX idx_alert_events_severity ON alert_events(severity);
CREATE INDEX idx_alert_events_source ON alert_events(source_engine);
CREATE INDEX idx_alert_events_created ON alert_events(created_at DESC);
CREATE INDEX idx_alert_events_rule ON alert_events(rule_id);

CREATE TABLE alert_channels (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  channel_type      TEXT NOT NULL DEFAULT 'in_app',
  name              TEXT NOT NULL,
  config            JSONB NOT NULL DEFAULT '{}',
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_alert_channels_org ON alert_channels(organization_id);

CREATE TABLE alert_subscriptions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  rule_id           UUID REFERENCES alert_rules(id) ON DELETE CASCADE,
  channel_id        UUID REFERENCES alert_channels(id) ON DELETE CASCADE,
  user_id           UUID,
  severity_filter   TEXT[] NOT NULL DEFAULT '{}',
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_alert_subscriptions_org ON alert_subscriptions(organization_id);
CREATE INDEX idx_alert_subscriptions_rule ON alert_subscriptions(rule_id);
CREATE INDEX idx_alert_subscriptions_user ON alert_subscriptions(user_id);

CREATE TABLE alert_notifications (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  event_id          UUID NOT NULL REFERENCES alert_events(id) ON DELETE CASCADE,
  channel_id        UUID REFERENCES alert_channels(id) ON DELETE SET NULL,
  user_id           UUID,
  recipient         TEXT,
  status            TEXT NOT NULL DEFAULT 'pending',
  sent_at           TIMESTAMPTZ,
  delivered_at      TIMESTAMPTZ,
  opened_at         TIMESTAMPTZ,
  error_message     TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_alert_notifications_org ON alert_notifications(organization_id);
CREATE INDEX idx_alert_notifications_event ON alert_notifications(event_id);
CREATE INDEX idx_alert_notifications_user ON alert_notifications(user_id);
CREATE INDEX idx_alert_notifications_status ON alert_notifications(status);

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE alert_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_alert_rules" ON alert_rules FOR SELECT
  TO authenticated USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE));
CREATE POLICY "insert_own_alert_rules" ON alert_rules FOR INSERT
  TO authenticated WITH CHECK (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE));
CREATE POLICY "update_own_alert_rules" ON alert_rules FOR UPDATE
  TO authenticated USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE))
  WITH CHECK (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE));
CREATE POLICY "delete_own_alert_rules" ON alert_rules FOR DELETE
  TO authenticated USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE));

CREATE POLICY "select_own_alert_events" ON alert_events FOR SELECT
  TO authenticated USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE));
CREATE POLICY "insert_own_alert_events" ON alert_events FOR INSERT
  TO authenticated WITH CHECK (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE));
CREATE POLICY "update_own_alert_events" ON alert_events FOR UPDATE
  TO authenticated USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE))
  WITH CHECK (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE));
CREATE POLICY "delete_own_alert_events" ON alert_events FOR DELETE
  TO authenticated USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE));

CREATE POLICY "select_own_alert_channels" ON alert_channels FOR SELECT
  TO authenticated USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE));
CREATE POLICY "insert_own_alert_channels" ON alert_channels FOR INSERT
  TO authenticated WITH CHECK (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE));
CREATE POLICY "update_own_alert_channels" ON alert_channels FOR UPDATE
  TO authenticated USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE))
  WITH CHECK (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE));
CREATE POLICY "delete_own_alert_channels" ON alert_channels FOR DELETE
  TO authenticated USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE));

CREATE POLICY "select_own_alert_subscriptions" ON alert_subscriptions FOR SELECT
  TO authenticated USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE));
CREATE POLICY "insert_own_alert_subscriptions" ON alert_subscriptions FOR INSERT
  TO authenticated WITH CHECK (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE));
CREATE POLICY "update_own_alert_subscriptions" ON alert_subscriptions FOR UPDATE
  TO authenticated USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE))
  WITH CHECK (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE));
CREATE POLICY "delete_own_alert_subscriptions" ON alert_subscriptions FOR DELETE
  TO authenticated USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE));

CREATE POLICY "select_own_alert_notifications" ON alert_notifications FOR SELECT
  TO authenticated USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE));
CREATE POLICY "insert_own_alert_notifications" ON alert_notifications FOR INSERT
  TO authenticated WITH CHECK (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE));
CREATE POLICY "update_own_alert_notifications" ON alert_notifications FOR UPDATE
  TO authenticated USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE))
  WITH CHECK (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE));
CREATE POLICY "delete_own_alert_notifications" ON alert_notifications FOR DELETE
  TO authenticated USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE));