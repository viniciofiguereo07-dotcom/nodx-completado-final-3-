
-- ============================================================
-- Core tables (no RLS/policies yet — just structure)
-- ============================================================

CREATE TABLE platform_bootstrap (
  id              INT PRIMARY KEY DEFAULT 1,
  bootstrap_done  BOOLEAN NOT NULL DEFAULT FALSE,
  bootstrapped_at TIMESTAMPTZ,
  bootstrapped_by UUID
);
INSERT INTO platform_bootstrap VALUES (1, FALSE, NULL, NULL);

CREATE TABLE profiles (
  id                    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email                 TEXT,
  full_name             TEXT,
  avatar_url            TEXT,
  user_code             TEXT UNIQUE,
  must_change_password  BOOLEAN NOT NULL DEFAULT FALSE,
  locale                TEXT DEFAULT 'en',
  organization_id       UUID,
  metadata              JSONB NOT NULL DEFAULT '{}',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE organizations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  slug        TEXT UNIQUE NOT NULL,
  logo_url    TEXT,
  settings    JSONB NOT NULL DEFAULT '{}',
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE organization_members (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role            TEXT NOT NULL DEFAULT 'field_agent',
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  invited_by      UUID,
  joined_at       TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

CREATE TABLE plans (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  code        TEXT UNIQUE NOT NULL,
  description TEXT,
  features    JSONB NOT NULL DEFAULT '{}',
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE licenses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  plan_id         UUID REFERENCES plans(id),
  status          TEXT NOT NULL DEFAULT 'active',
  valid_from      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_until     TIMESTAMPTZ,
  max_users       INT,
  metadata        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE modules (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key         TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  description TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE organization_modules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  module_key      TEXT NOT NULL,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  enabled_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  enabled_by      UUID,
  UNIQUE(organization_id, module_key)
);

CREATE TABLE permissions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role            TEXT NOT NULL,
  resource        TEXT NOT NULL,
  action          TEXT NOT NULL,
  is_allowed      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE access_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID,
  event_type  TEXT NOT NULL,
  ip_address  TEXT,
  user_agent  TEXT,
  metadata    JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE audit_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID,
  user_id         UUID,
  action          TEXT NOT NULL,
  resource_type   TEXT,
  resource_id     TEXT,
  changes         JSONB,
  ip_address      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE territories (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  parent_id       UUID REFERENCES territories(id),
  name            TEXT NOT NULL,
  code            TEXT,
  level           INT NOT NULL DEFAULT 0,
  level_name      TEXT,
  boundary        JSONB,
  center_lat      NUMERIC,
  center_lng      NUMERIC,
  area_km2        NUMERIC,
  population      INT,
  metadata        JSONB NOT NULL DEFAULT '{}',
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE routes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  territory_id    UUID REFERENCES territories(id),
  name            TEXT NOT NULL,
  description     TEXT,
  waypoints       JSONB NOT NULL DEFAULT '[]',
  status          TEXT NOT NULL DEFAULT 'active',
  metadata        JSONB NOT NULL DEFAULT '{}',
  created_by      UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE visits (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  route_id        UUID REFERENCES routes(id),
  territory_id    UUID REFERENCES territories(id),
  assigned_to     UUID,
  status          TEXT NOT NULL DEFAULT 'scheduled',
  scheduled_at    TIMESTAMPTZ,
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  notes           TEXT,
  location        JSONB,
  metadata        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE form_templates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  schema          JSONB NOT NULL DEFAULT '{"fields":[]}',
  version         INT NOT NULL DEFAULT 1,
  status          TEXT NOT NULL DEFAULT 'draft',
  tags            TEXT[] NOT NULL DEFAULT '{}',
  created_by      UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE form_submissions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  template_id      UUID REFERENCES form_templates(id),
  template_version INT NOT NULL DEFAULT 1,
  visit_id         UUID REFERENCES visits(id),
  submitted_by     UUID,
  data             JSONB NOT NULL DEFAULT '{}',
  location         JSONB,
  attachments      TEXT[] NOT NULL DEFAULT '{}',
  status           TEXT NOT NULL DEFAULT 'submitted',
  reviewed_by      UUID,
  reviewed_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE workflows (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  nodes           JSONB NOT NULL DEFAULT '[]',
  edges           JSONB NOT NULL DEFAULT '[]',
  status          TEXT NOT NULL DEFAULT 'draft',
  version         INT NOT NULL DEFAULT 1,
  created_by      UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE workflow_executions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  workflow_id     UUID REFERENCES workflows(id),
  trigger_type    TEXT,
  trigger_id      TEXT,
  status          TEXT NOT NULL DEFAULT 'running',
  current_node    TEXT,
  execution_log   JSONB NOT NULL DEFAULT '[]',
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE inventory_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  territory_id      UUID REFERENCES territories(id),
  name              TEXT NOT NULL,
  sku               TEXT,
  description       TEXT,
  unit              TEXT NOT NULL DEFAULT 'unit',
  quantity_on_hand  NUMERIC NOT NULL DEFAULT 0,
  quantity_reserved NUMERIC NOT NULL DEFAULT 0,
  reorder_threshold NUMERIC NOT NULL DEFAULT 0,
  center_lat        NUMERIC,
  center_lng        NUMERIC,
  metadata          JSONB NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE geometry_features (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  layer_id        UUID,
  feature_type    TEXT NOT NULL DEFAULT 'Point',
  geometry        JSONB NOT NULL DEFAULT '{}',
  properties      JSONB NOT NULL DEFAULT '{}',
  label           TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_by      UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE risk_layers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  risk_type       TEXT NOT NULL,
  severity        TEXT NOT NULL DEFAULT 'medium',
  geometry        JSONB,
  properties      JSONB NOT NULL DEFAULT '{}',
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_by      UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE vulnerability_assessments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  territory_id    UUID REFERENCES territories(id),
  name            TEXT NOT NULL,
  assessment_type TEXT NOT NULL,
  score           NUMERIC,
  findings        JSONB NOT NULL DEFAULT '{}',
  assessed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  assessed_by     UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE geographic_levels (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  level           INT NOT NULL,
  description     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE geographic_units (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  level_id        UUID REFERENCES geographic_levels(id),
  parent_id       UUID REFERENCES geographic_units(id),
  name            TEXT NOT NULL,
  code            TEXT,
  boundary        JSONB,
  center_lat      NUMERIC,
  center_lng      NUMERIC,
  population      INT,
  metadata        JSONB NOT NULL DEFAULT '{}',
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE translation_keys (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  namespace   TEXT NOT NULL,
  key         TEXT NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(namespace, key)
);

CREATE TABLE translation_values (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_id      UUID NOT NULL REFERENCES translation_keys(id) ON DELETE CASCADE,
  locale      TEXT NOT NULL,
  value       TEXT NOT NULL,
  is_machine  BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(key_id, locale)
);

CREATE TABLE data_policies (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  policy_type     TEXT NOT NULL,
  description     TEXT,
  rules           JSONB NOT NULL DEFAULT '{}',
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_by      UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE retention_policies (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  table_name      TEXT NOT NULL,
  retention_days  INT NOT NULL DEFAULT 365,
  action          TEXT NOT NULL DEFAULT 'archive',
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, table_name)
);

CREATE TABLE archive_jobs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  table_name      TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending',
  rows_archived   INT,
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  error_message   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE data_export_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  requested_by    UUID,
  format          TEXT NOT NULL DEFAULT 'csv',
  tables          TEXT[] NOT NULL DEFAULT '{}',
  status          TEXT NOT NULL DEFAULT 'pending',
  download_url    TEXT,
  expires_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE diagnostic_rules (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  description       TEXT,
  severity          TEXT NOT NULL DEFAULT 'medium',
  category          TEXT,
  applies_to_table  TEXT NOT NULL,
  condition_rules   JSONB NOT NULL DEFAULT '[]',
  action_payload    JSONB NOT NULL DEFAULT '{}',
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  last_run_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE diagnostic_results (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  rule_id         UUID REFERENCES diagnostic_rules(id),
  record_type     TEXT,
  record_id       TEXT,
  severity        TEXT NOT NULL DEFAULT 'medium',
  status          TEXT NOT NULL DEFAULT 'open',
  finding         TEXT,
  recommendation  TEXT,
  evidence        JSONB,
  acknowledged_by UUID,
  resolved_by     UUID,
  resolved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE recommendation_instances (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  description     TEXT,
  priority        INT NOT NULL DEFAULT 5,
  status          TEXT NOT NULL DEFAULT 'pending',
  source_type     TEXT,
  source_id       TEXT,
  assigned_to     UUID,
  due_date        TIMESTAMPTZ,
  metadata        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE taxonomy_groups (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  code            TEXT NOT NULL,
  description     TEXT,
  is_system       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE taxonomy_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id    UUID NOT NULL REFERENCES taxonomy_groups(id) ON DELETE CASCADE,
  parent_id   UUID REFERENCES taxonomy_items(id),
  code        TEXT NOT NULL,
  name        TEXT NOT NULL,
  description TEXT,
  sort_order  INT NOT NULL DEFAULT 0,
  metadata    JSONB NOT NULL DEFAULT '{}',
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE import_jobs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  target_table    TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending',
  total_rows      INT,
  processed_rows  INT NOT NULL DEFAULT 0,
  error_rows      INT NOT NULL DEFAULT 0,
  mapping         JSONB NOT NULL DEFAULT '{}',
  errors          JSONB NOT NULL DEFAULT '[]',
  file_path       TEXT,
  created_by      UUID,
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE programs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  start_date      DATE,
  end_date        DATE,
  status          TEXT NOT NULL DEFAULT 'active',
  metadata        JSONB NOT NULL DEFAULT '{}',
  created_by      UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE projects (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  program_id      UUID REFERENCES programs(id),
  name            TEXT NOT NULL,
  description     TEXT,
  start_date      DATE,
  end_date        DATE,
  status          TEXT NOT NULL DEFAULT 'active',
  budget          NUMERIC,
  currency        TEXT DEFAULT 'USD',
  geo_unit_id     UUID,
  metadata        JSONB NOT NULL DEFAULT '{}',
  created_by      UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE activities (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  start_date  DATE,
  end_date    DATE,
  status      TEXT NOT NULL DEFAULT 'planned',
  progress    NUMERIC DEFAULT 0,
  metadata    JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE indicator_catalog (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  parent_id       UUID REFERENCES indicator_catalog(id),
  code            TEXT NOT NULL,
  name            TEXT NOT NULL,
  description     TEXT,
  sector          TEXT,
  unit            TEXT,
  data_type       TEXT NOT NULL DEFAULT 'numeric',
  formula         TEXT,
  aggregation     TEXT NOT NULL DEFAULT 'average',
  is_composite    BOOLEAN NOT NULL DEFAULT FALSE,
  is_system       BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order      INT NOT NULL DEFAULT 0,
  metadata        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE VIEW indicator_catalog_items AS SELECT * FROM indicator_catalog;

CREATE TABLE indicator_thresholds (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  indicator_id    UUID NOT NULL REFERENCES indicator_catalog(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  label           TEXT NOT NULL,
  min_value       NUMERIC,
  max_value       NUMERIC,
  color           TEXT,
  severity        TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE indicator_values (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  indicator_id     UUID NOT NULL REFERENCES indicator_catalog(id) ON DELETE CASCADE,
  geo_unit_id      UUID REFERENCES geographic_units(id),
  project_id       UUID REFERENCES projects(id),
  period_start     DATE,
  period_end       DATE,
  value            NUMERIC,
  text_value       TEXT,
  source           TEXT NOT NULL DEFAULT 'manual',
  source_record_id UUID,
  quality_score    NUMERIC,
  notes            TEXT,
  recorded_by      UUID,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE data_quality_rules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  check_type      TEXT NOT NULL,
  applies_to      TEXT NOT NULL,
  field_path      TEXT,
  condition_rules JSONB NOT NULL DEFAULT '[]',
  severity        TEXT NOT NULL DEFAULT 'warning',
  score_impact    NUMERIC NOT NULL DEFAULT 5,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE data_quality_issues (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  rule_id         UUID REFERENCES data_quality_rules(id),
  record_type     TEXT NOT NULL,
  record_id       UUID,
  severity        TEXT NOT NULL DEFAULT 'warning',
  status          TEXT NOT NULL DEFAULT 'open',
  description     TEXT,
  evidence        JSONB,
  resolved_by     UUID,
  resolved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE approval_workflows (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  applies_to      TEXT NOT NULL,
  stages          JSONB NOT NULL DEFAULT '[]',
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_by      UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE approval_instances (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  workflow_id     UUID REFERENCES approval_workflows(id),
  record_type     TEXT NOT NULL,
  record_id       UUID NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending',
  current_stage   INT NOT NULL DEFAULT 0,
  submitted_by    UUID,
  completed_at    TIMESTAMPTZ,
  metadata        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE approval_stage_records (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID NOT NULL REFERENCES approval_instances(id) ON DELETE CASCADE,
  stage_index INT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending',
  reviewer_id UUID,
  decision    TEXT,
  notes       TEXT,
  decided_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE evidence_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  linked_type     TEXT,
  linked_id       UUID,
  evidence_type   TEXT NOT NULL DEFAULT 'photo',
  title           TEXT,
  description     TEXT,
  storage_path    TEXT,
  file_size_bytes INT,
  mime_type       TEXT,
  geo_location    JSONB,
  captured_at     TIMESTAMPTZ,
  captured_by     UUID,
  metadata        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE knowledge_categories (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  parent_id       UUID REFERENCES knowledge_categories(id),
  color           TEXT,
  icon            TEXT,
  sort_order      INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE knowledge_articles (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  category_id      UUID REFERENCES knowledge_categories(id),
  title            TEXT NOT NULL,
  content          TEXT,
  document_type    TEXT NOT NULL DEFAULT 'article',
  tags             TEXT[] NOT NULL DEFAULT '{}',
  version          INT NOT NULL DEFAULT 1,
  lifecycle_status TEXT NOT NULL DEFAULT 'draft',
  is_public        BOOLEAN NOT NULL DEFAULT FALSE,
  storage_path     TEXT,
  file_size_bytes  INT,
  mime_type        TEXT,
  author_id        UUID,
  approved_by      UUID,
  approved_at      TIMESTAMPTZ,
  published_at     TIMESTAMPTZ,
  view_count       INT NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE tasks (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title            TEXT NOT NULL,
  description      TEXT,
  task_type        TEXT NOT NULL DEFAULT 'action',
  priority         TEXT NOT NULL DEFAULT 'medium',
  status           TEXT NOT NULL DEFAULT 'pending',
  source_type      TEXT,
  source_id        UUID,
  project_id       UUID REFERENCES projects(id),
  assigned_to      UUID,
  assigned_by      UUID,
  due_date         TIMESTAMPTZ,
  completed_at     TIMESTAMPTZ,
  completion_notes TEXT,
  geo_unit_id      UUID,
  tags             TEXT[] NOT NULL DEFAULT '{}',
  metadata         JSONB NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE task_comments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id         UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  author_id       UUID NOT NULL,
  content         TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE search_index (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  record_type     TEXT NOT NULL,
  record_id       UUID NOT NULL,
  title           TEXT NOT NULL,
  body            TEXT,
  tags            TEXT[] NOT NULL DEFAULT '{}',
  category        TEXT,
  geo_unit_id     UUID,
  project_id      UUID,
  metadata        JSONB NOT NULL DEFAULT '{}',
  indexed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE observatory_dashboards (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  geo_level       TEXT,
  geo_unit_id     UUID,
  widgets         JSONB NOT NULL DEFAULT '[]',
  is_public       BOOLEAN NOT NULL DEFAULT FALSE,
  created_by      UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE observatory_alerts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  dashboard_id    UUID REFERENCES observatory_dashboards(id),
  geo_unit_id     UUID,
  alert_type      TEXT NOT NULL,
  severity        TEXT NOT NULL DEFAULT 'medium',
  title           TEXT NOT NULL,
  description     TEXT,
  indicator_id    UUID REFERENCES indicator_catalog(id),
  status          TEXT NOT NULL DEFAULT 'active',
  acknowledged_by UUID,
  resolved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE ai_queries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  asked_by        UUID,
  question        TEXT NOT NULL,
  answer          TEXT,
  context_types   TEXT[] NOT NULL DEFAULT '{}',
  context_ids     TEXT[] NOT NULL DEFAULT '{}',
  model_used      TEXT,
  tokens_used     INT,
  confidence      NUMERIC,
  status          TEXT NOT NULL DEFAULT 'pending',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ
);

CREATE TABLE ai_insights (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  insight_type    TEXT NOT NULL,
  title           TEXT NOT NULL,
  content         TEXT NOT NULL,
  confidence      NUMERIC,
  linked_type     TEXT,
  linked_id       UUID,
  geo_unit_id     UUID,
  generated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at      TIMESTAMPTZ,
  is_pinned       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE sync_queue (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  user_id         UUID,
  entity_type     TEXT NOT NULL,
  entity_id       UUID,
  operation       TEXT NOT NULL,
  payload         JSONB NOT NULL DEFAULT '{}',
  status          TEXT NOT NULL DEFAULT 'pending',
  attempts        INT NOT NULL DEFAULT 0,
  error_message   TEXT,
  synced_at       TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Engine tables (the 5 new ones for this task)
-- ============================================================

CREATE TABLE tabulation_configs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  form_template_id UUID REFERENCES form_templates(id),
  name             TEXT NOT NULL,
  description      TEXT,
  scoring_type     TEXT NOT NULL DEFAULT 'weighted_score',
  field_weights    JSONB NOT NULL DEFAULT '[]',
  category_rules   JSONB NOT NULL DEFAULT '[]',
  aggregation_cfg  JSONB NOT NULL DEFAULT '{}',
  output_levels    TEXT[] NOT NULL DEFAULT ARRAY['individual'],
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_by       UUID,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE tabulation_results (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  config_id           UUID REFERENCES tabulation_configs(id) ON DELETE SET NULL,
  form_submission_id  UUID REFERENCES form_submissions(id) ON DELETE CASCADE,
  subject_type        TEXT NOT NULL DEFAULT 'individual',
  subject_id          TEXT,
  period_start        DATE,
  period_end          DATE,
  scoring_type        TEXT NOT NULL,
  raw_score           NUMERIC,
  weighted_score      NUMERIC,
  max_possible_score  NUMERIC,
  percentage          NUMERIC,
  category            TEXT,
  rating              TEXT,
  index_value         NUMERIC,
  composite_score     NUMERIC,
  aggregations        JSONB NOT NULL DEFAULT '{}',
  cross_tabs          JSONB NOT NULL DEFAULT '{}',
  comparisons         JSONB NOT NULL DEFAULT '{}',
  field_scores        JSONB NOT NULL DEFAULT '{}',
  metadata            JSONB NOT NULL DEFAULT '{}',
  calculated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tabulation_results_org        ON tabulation_results(organization_id);
CREATE INDEX idx_tabulation_results_submission ON tabulation_results(form_submission_id);
CREATE INDEX idx_tabulation_results_subject    ON tabulation_results(subject_type, subject_id);
CREATE INDEX idx_tabulation_results_period     ON tabulation_results(period_start, period_end);

CREATE TABLE score_results (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  tabulation_id   UUID REFERENCES tabulation_results(id) ON DELETE CASCADE,
  field_key       TEXT NOT NULL,
  field_label     TEXT,
  raw_value       NUMERIC,
  weight          NUMERIC NOT NULL DEFAULT 1,
  weighted_value  NUMERIC,
  max_value       NUMERIC,
  percentage      NUMERIC,
  category        TEXT,
  band_label      TEXT,
  metadata        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_score_results_tab ON score_results(tabulation_id);
CREATE INDEX idx_score_results_org ON score_results(organization_id);

CREATE TABLE composite_indexes (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  code              TEXT NOT NULL,
  description       TEXT,
  component_weights JSONB NOT NULL DEFAULT '[]',
  normalization     TEXT NOT NULL DEFAULT 'min_max',
  output_range_min  NUMERIC NOT NULL DEFAULT 0,
  output_range_max  NUMERIC NOT NULL DEFAULT 100,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_by        UUID,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE semaphore_rules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  rule_type       TEXT NOT NULL DEFAULT 'indicator',
  indicator_id    UUID REFERENCES indicator_catalog(id),
  metric_key      TEXT,
  thresholds      JSONB NOT NULL DEFAULT '[]',
  applies_to      TEXT NOT NULL DEFAULT 'organization',
  priority        INT NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_by      UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_semaphore_rules_org ON semaphore_rules(organization_id);

CREATE TABLE semaphore_results (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  rule_id         UUID REFERENCES semaphore_rules(id) ON DELETE CASCADE,
  subject_type    TEXT NOT NULL DEFAULT 'organization',
  subject_id      TEXT,
  metric_value    NUMERIC,
  status          TEXT NOT NULL DEFAULT 'green',
  previous_status TEXT,
  threshold_hit   JSONB,
  notes           TEXT,
  evaluated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_semaphore_results_org       ON semaphore_results(organization_id);
CREATE INDEX idx_semaphore_results_rule      ON semaphore_results(rule_id);
CREATE INDEX idx_semaphore_results_subject   ON semaphore_results(subject_type, subject_id);
CREATE INDEX idx_semaphore_results_status    ON semaphore_results(status);
CREATE INDEX idx_semaphore_results_evaluated ON semaphore_results(evaluated_at DESC);
