
-- ============================================================
-- Core tables (no RLS/policies yet — just structure)
-- ============================================================

CREATE TABLE IF NOT EXISTS platform_bootstrap (
  id              INT PRIMARY KEY DEFAULT 1,
  bootstrap_done  BOOLEAN NOT NULL DEFAULT FALSE,
  bootstrapped_at TIMESTAMPTZ,
  bootstrapped_by UUID,
  bootstrapped_node_user_id UUID,
  nodx_root_user_id UUID
);
INSERT INTO platform_bootstrap (id, bootstrap_done) VALUES (1, FALSE) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS profiles (
  id                    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email                 TEXT,
  full_name             TEXT,
  avatar_url            TEXT,
  user_code             TEXT UNIQUE,
  must_change_password  BOOLEAN NOT NULL DEFAULT FALSE,
  locale                TEXT DEFAULT 'en',
  organization_id       UUID,
  nodx_access_level     INT,
  metadata              JSONB NOT NULL DEFAULT '{}',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS organizations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  slug        TEXT UNIQUE NOT NULL,
  logo_url    TEXT,
  settings    JSONB NOT NULL DEFAULT '{}',
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS organization_members (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role            TEXT NOT NULL DEFAULT 'agent',
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  invited_by      UUID,
  joined_at       TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

CREATE TABLE IF NOT EXISTS plans (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT NOT NULL,
  description       TEXT,
  max_members       INT NOT NULL DEFAULT 10,
  max_devices       INT NOT NULL DEFAULT 5,
  max_territories   INT NOT NULL DEFAULT 10,
  max_storage_gb    INT NOT NULL DEFAULT 5,
  included_modules  TEXT[] NOT NULL DEFAULT '{}',
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS licenses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  plan_id         UUID REFERENCES plans(id),
  status          TEXT NOT NULL DEFAULT 'trial',
  starts_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at      TIMESTAMPTZ,
  metadata        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS modules (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key         TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  description TEXT,
  is_core     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS organization_modules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  module_key      TEXT NOT NULL,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  enabled_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  enabled_by      UUID,
  UNIQUE(organization_id, module_key)
);

CREATE TABLE IF NOT EXISTS permissions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module          TEXT NOT NULL,
  name            TEXT NOT NULL,
  key             TEXT NOT NULL UNIQUE,
  description     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS access_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID,
  organization_id UUID,
  event_type      TEXT NOT NULL,
  ip_address      TEXT,
  user_agent      TEXT,
  metadata        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID,
  actor_id        UUID,
  action          TEXT NOT NULL,
  resource_type   TEXT,
  resource_id     TEXT,
  changes         JSONB,
  ip_address      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Territory engine
CREATE TABLE IF NOT EXISTS territories (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  parent_id       UUID REFERENCES territories(id),
  name            TEXT NOT NULL,
  code            TEXT,
  level           TEXT NOT NULL DEFAULT 'municipality',
  level_order     INT NOT NULL DEFAULT 0,
  description     TEXT,
  color           TEXT NOT NULL DEFAULT '#3B82F6',
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

CREATE TABLE IF NOT EXISTS routes (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id             UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  territory_id                UUID REFERENCES territories(id),
  name                        TEXT NOT NULL,
  description                 TEXT,
  waypoints                   JSONB NOT NULL DEFAULT '[]',
  distance_km                 NUMERIC NOT NULL DEFAULT 0,
  estimated_duration_minutes  INT NOT NULL DEFAULT 0,
  recurrence                  TEXT NOT NULL DEFAULT 'none',
  status                      TEXT NOT NULL DEFAULT 'draft',
  completion_percentage       NUMERIC NOT NULL DEFAULT 0,
  execution_count             INT NOT NULL DEFAULT 0,
  last_executed_at            TIMESTAMPTZ,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS visits (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  route_id        UUID REFERENCES routes(id),
  territory_id    UUID REFERENCES territories(id),
  agent_id        UUID,
  address         TEXT,
  location        JSONB,
  status          TEXT NOT NULL DEFAULT 'scheduled',
  notes           TEXT,
  scheduled_at    TIMESTAMPTZ,
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  metadata        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Forms engine
CREATE TABLE IF NOT EXISTS form_templates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  schema          JSONB NOT NULL DEFAULT '{"fields":[],"logic":[],"groups":[]}',
  version         INT NOT NULL DEFAULT 1,
  status          TEXT NOT NULL DEFAULT 'draft',
  tags            TEXT[] NOT NULL DEFAULT '{}',
  created_by      UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS form_submissions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  template_id     UUID REFERENCES form_templates(id),
  visit_id        UUID REFERENCES visits(id),
  submitted_by    UUID,
  data            JSONB NOT NULL DEFAULT '{}',
  location        JSONB,
  status          TEXT NOT NULL DEFAULT 'submitted',
  submitted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Inventory engine
CREATE TABLE IF NOT EXISTS inventory_items (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  territory_id        UUID REFERENCES territories(id),
  name                TEXT NOT NULL,
  sku                 TEXT,
  description         TEXT,
  unit                TEXT NOT NULL DEFAULT 'units',
  quantity_on_hand    NUMERIC NOT NULL DEFAULT 0,
  reorder_threshold   NUMERIC NOT NULL DEFAULT 0,
  cost_per_unit       NUMERIC,
  center_lat          NUMERIC,
  center_lng          NUMERIC,
  metadata            JSONB NOT NULL DEFAULT '{}',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sync engine
CREATE TABLE IF NOT EXISTS sync_queue (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         UUID,
  device_id       TEXT,
  operation       TEXT NOT NULL,
  resource_type   TEXT NOT NULL,
  resource_id     TEXT,
  payload         JSONB NOT NULL DEFAULT '{}',
  status          TEXT NOT NULL DEFAULT 'pending',
  retry_count     INT NOT NULL DEFAULT 0,
  error_message   TEXT,
  conflict_data   JSONB,
  synced_at       TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Workflow engine
CREATE TABLE IF NOT EXISTS workflows (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  definition      JSONB NOT NULL DEFAULT '{"nodes":[],"edges":[]}',
  trigger_type    TEXT NOT NULL DEFAULT 'manual',
  status          TEXT NOT NULL DEFAULT 'draft',
  execution_count INT NOT NULL DEFAULT 0,
  last_executed_at TIMESTAMPTZ,
  created_by      UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workflow_executions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  workflow_id     UUID REFERENCES workflows(id),
  triggered_by    UUID,
  status          TEXT NOT NULL DEFAULT 'running',
  current_node    TEXT,
  logs            JSONB NOT NULL DEFAULT '[]',
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- AI engine
CREATE TABLE IF NOT EXISTS ai_queries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         UUID,
  asked_by        UUID,
  question        TEXT,
  answer          TEXT,
  context_types   TEXT[] DEFAULT '{}',
  context_ids     TEXT[] DEFAULT '{}',
  model_used      TEXT,
  confidence      NUMERIC,
  prompt          TEXT,
  query_type      TEXT NOT NULL DEFAULT 'general',
  context         JSONB NOT NULL DEFAULT '{}',
  result          JSONB,
  summary         TEXT,
  insights        JSONB NOT NULL DEFAULT '[]',
  status          TEXT NOT NULL DEFAULT 'pending',
  error           TEXT,
  tokens_used     INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS ai_insights (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  insight_type    TEXT NOT NULL DEFAULT 'summary',
  title           TEXT NOT NULL,
  content         TEXT NOT NULL,
  confidence      NUMERIC,
  linked_type     TEXT,
  linked_id       TEXT,
  geo_unit_id     TEXT,
  is_pinned       BOOLEAN NOT NULL DEFAULT FALSE,
  generated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Geospatial engine
CREATE TABLE IF NOT EXISTS geometry_features (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  type            TEXT NOT NULL DEFAULT 'point',
  geometry        JSONB NOT NULL,
  style           JSONB NOT NULL DEFAULT '{}',
  properties      JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS risk_layers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  geometry_feature_id UUID REFERENCES geometry_features(id),
  name            TEXT NOT NULL,
  category        TEXT NOT NULL DEFAULT 'risk',
  hazard_type     TEXT,
  severity        INT NOT NULL DEFAULT 3,
  source          TEXT,
  assessment_date DATE,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_by      UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Geographic hierarchy
CREATE TABLE IF NOT EXISTS geographic_levels (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  rank        INT NOT NULL DEFAULT 0,
  is_system   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS geographic_units (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID,
  level_id    UUID REFERENCES geographic_levels(id),
  parent_id   UUID REFERENCES geographic_units(id),
  name        TEXT NOT NULL,
  code        TEXT,
  pcode       TEXT,
  iso_code    TEXT,
  population  INT,
  area_km2    NUMERIC,
  centroid    JSONB,
  metadata    JSONB NOT NULL DEFAULT '{}',
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Import engine
CREATE TABLE IF NOT EXISTS import_jobs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by      UUID,
  target_table    TEXT NOT NULL,
  file_name       TEXT NOT NULL,
  file_format     TEXT NOT NULL DEFAULT 'csv',
  status          TEXT NOT NULL DEFAULT 'pending',
  total_rows      INT,
  imported_rows   INT NOT NULL DEFAULT 0,
  skipped_rows    INT NOT NULL DEFAULT 0,
  failed_rows     INT NOT NULL DEFAULT 0,
  error_log       JSONB NOT NULL DEFAULT '[]',
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Vulnerability
CREATE TABLE IF NOT EXISTS vulnerability_assessments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  indicator_name    TEXT NOT NULL,
  indicator_value   NUMERIC,
  indicator_score   INT,
  assessment_date   DATE,
  source            TEXT,
  created_by        UUID,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- I18n
CREATE TABLE IF NOT EXISTS translation_keys (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  namespace_id    TEXT NOT NULL DEFAULT 'ui',
  key             TEXT NOT NULL UNIQUE,
  default_value   TEXT,
  is_system       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS translation_values (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_id        UUID NOT NULL REFERENCES translation_keys(id) ON DELETE CASCADE,
  language_code TEXT NOT NULL,
  value         TEXT NOT NULL,
  is_approved   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(key_id, language_code)
);

-- Taxonomy
CREATE TABLE IF NOT EXISTS taxonomy_groups (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID,
  name            TEXT NOT NULL,
  description     TEXT,
  sector          TEXT NOT NULL DEFAULT 'M&E',
  is_system       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS taxonomy_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id    UUID NOT NULL REFERENCES taxonomy_groups(id) ON DELETE CASCADE,
  parent_id   UUID REFERENCES taxonomy_items(id),
  code        TEXT NOT NULL,
  label       TEXT NOT NULL,
  description TEXT,
  sort_order  INT NOT NULL DEFAULT 0,
  is_system   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Projects
CREATE TABLE IF NOT EXISTS programs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  code            TEXT,
  description     TEXT,
  sector          TEXT,
  start_date      DATE,
  end_date        DATE,
  budget          NUMERIC,
  currency        TEXT NOT NULL DEFAULT 'USD',
  status          TEXT NOT NULL DEFAULT 'active',
  lead_by         TEXT,
  metadata        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS projects (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  program_id          UUID REFERENCES programs(id),
  name                TEXT NOT NULL,
  code                TEXT,
  description         TEXT,
  objectives          TEXT[] NOT NULL DEFAULT '{}',
  start_date          DATE,
  end_date            DATE,
  budget              NUMERIC,
  currency            TEXT NOT NULL DEFAULT 'USD',
  status              TEXT NOT NULL DEFAULT 'active',
  geo_coverage        TEXT,
  beneficiary_target  INT,
  beneficiary_actual  INT,
  lead_by             TEXT,
  metadata            JSONB NOT NULL DEFAULT '{}',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS activities (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id      UUID REFERENCES projects(id),
  name            TEXT NOT NULL,
  description     TEXT,
  activity_type   TEXT,
  start_date      DATE,
  end_date        DATE,
  status          TEXT NOT NULL DEFAULT 'pending',
  target_count    INT,
  actual_count    INT,
  assigned_to     TEXT,
  geo_unit_id     TEXT,
  metadata        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indicators
CREATE TABLE IF NOT EXISTS indicator_catalog (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID,
  org_id          UUID REFERENCES organizations(id) ON DELETE CASCADE,
  parent_id       UUID REFERENCES indicator_catalog(id),
  code            TEXT NOT NULL,
  name            TEXT NOT NULL,
  description     TEXT,
  formula         TEXT,
  sector          TEXT,
  data_type       TEXT NOT NULL DEFAULT 'numeric',
  unit            TEXT,
  unit_of_measure TEXT,
  aggregation_method TEXT NOT NULL DEFAULT 'sum',
  baseline_value  NUMERIC,
  target_value    NUMERIC,
  is_composite    BOOLEAN NOT NULL DEFAULT FALSE,
  is_system       BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order      INT NOT NULL DEFAULT 0,
  metadata        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE NULLS NOT DISTINCT (org_id, code)
);

CREATE TABLE IF NOT EXISTS indicator_thresholds (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID REFERENCES organizations(id) ON DELETE CASCADE,
  indicator_id  UUID NOT NULL REFERENCES indicator_catalog(id) ON DELETE CASCADE,
  severity      TEXT,
  min_value     NUMERIC,
  max_value     NUMERIC,
  label         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS indicator_values (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  org_id          UUID REFERENCES organizations(id) ON DELETE CASCADE,
  indicator_id    UUID NOT NULL REFERENCES indicator_catalog(id) ON DELETE CASCADE,
  geo_unit_id     TEXT,
  project_id      UUID REFERENCES projects(id),
  value           NUMERIC,
  period_start    DATE,
  period_end      DATE,
  source          TEXT,
  quality_score   NUMERIC,
  metadata        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Households (WASH support)
CREATE TABLE IF NOT EXISTS households (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  household_id          TEXT,
  head_of_household     TEXT,
  head_sex              TEXT,
  household_size        INT,
  lat                   NUMERIC,
  lng                   NUMERIC,
  address               TEXT,
  displacement_status   TEXT,
  metadata              JSONB NOT NULL DEFAULT '{}',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wash_water_points (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  type            TEXT,
  status          TEXT,
  lat             NUMERIC,
  lng             NUMERIC,
  population_served INT,
  metadata        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wash_sanitation_facilities (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  type            TEXT,
  status          TEXT,
  lat             NUMERIC,
  lng             NUMERIC,
  metadata        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Diagnostic rules
CREATE TABLE IF NOT EXISTS diagnostic_rules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  category        TEXT NOT NULL DEFAULT 'data_quality',
  severity        TEXT NOT NULL DEFAULT 'medium',
  applies_to_table TEXT NOT NULL,
  condition_rules JSONB NOT NULL DEFAULT '[]',
  action_type     TEXT NOT NULL DEFAULT 'flag',
  action_payload  JSONB NOT NULL DEFAULT '{}',
  run_frequency   TEXT NOT NULL DEFAULT 'on_demand',
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  last_run_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS diagnostic_results (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  rule_id         UUID REFERENCES diagnostic_rules(id),
  record_type     TEXT NOT NULL,
  record_id       TEXT,
  severity        TEXT NOT NULL DEFAULT 'medium',
  finding         TEXT NOT NULL,
  recommendation  TEXT,
  evidence        JSONB NOT NULL DEFAULT '{}',
  status          TEXT NOT NULL DEFAULT 'open',
  acknowledged_by UUID,
  resolved_by     UUID,
  resolved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS recommendation_instances (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  template_id     UUID,
  linked_record_type TEXT,
  linked_record_id TEXT,
  title           TEXT NOT NULL,
  description     TEXT,
  priority        INT NOT NULL DEFAULT 5,
  status          TEXT NOT NULL DEFAULT 'pending',
  assigned_to     UUID,
  due_date        DATE,
  completed_at    TIMESTAMPTZ,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Semaphore engine
CREATE TABLE IF NOT EXISTS semaphore_rules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  rule_type       TEXT NOT NULL DEFAULT 'indicator',
  indicator_id    UUID,
  metric_key      TEXT,
  thresholds      JSONB NOT NULL DEFAULT '[]',
  applies_to      TEXT NOT NULL DEFAULT 'organization',
  priority        INT NOT NULL DEFAULT 5,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_by      UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS semaphore_results (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  rule_id         UUID REFERENCES semaphore_rules(id),
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

-- Tabulation engine
CREATE TABLE IF NOT EXISTS tabulation_configs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  form_template_id  UUID REFERENCES form_templates(id),
  name              TEXT NOT NULL,
  description       TEXT,
  scoring_type      TEXT NOT NULL DEFAULT 'weighted_score',
  field_weights     JSONB NOT NULL DEFAULT '[]',
  category_rules    JSONB NOT NULL DEFAULT '[]',
  aggregation_cfg   JSONB NOT NULL DEFAULT '{}',
  output_levels     TEXT[] NOT NULL DEFAULT '{}',
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_by        UUID,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tabulation_results (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  config_id           UUID REFERENCES tabulation_configs(id),
  form_submission_id  UUID REFERENCES form_submissions(id),
  subject_type        TEXT NOT NULL DEFAULT 'individual',
  subject_id          TEXT,
  period_start        DATE,
  period_end          DATE,
  scoring_type        TEXT NOT NULL DEFAULT 'weighted_score',
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

CREATE TABLE IF NOT EXISTS score_results (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  tabulation_id   UUID REFERENCES tabulation_results(id),
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

CREATE TABLE IF NOT EXISTS composite_indexes (
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

-- Data governance
CREATE TABLE IF NOT EXISTS data_policies (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  policy_type     TEXT NOT NULL DEFAULT 'retention',
  applies_to      TEXT[] NOT NULL DEFAULT '{}',
  rules           JSONB NOT NULL DEFAULT '{}',
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS retention_policies (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  table_name      TEXT NOT NULL,
  retention_days  INT NOT NULL DEFAULT 365,
  archive_after_days INT,
  purge_after_days INT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, table_name)
);

CREATE TABLE IF NOT EXISTS archive_jobs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  policy_id         UUID,
  table_name        TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'pending',
  records_scanned   INT NOT NULL DEFAULT 0,
  records_archived  INT NOT NULL DEFAULT 0,
  records_purged    INT NOT NULL DEFAULT 0,
  triggered_by      UUID,
  error_message     TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS data_export_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  requested_by    UUID,
  export_type     TEXT NOT NULL DEFAULT 'full',
  tables          TEXT[],
  filters         JSONB NOT NULL DEFAULT '{}',
  format          TEXT NOT NULL DEFAULT 'csv',
  status          TEXT NOT NULL DEFAULT 'pending',
  file_url        TEXT,
  record_count    INT,
  expires_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ
);

-- Search index
CREATE TABLE IF NOT EXISTS search_index (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  record_type     TEXT NOT NULL,
  record_id       TEXT,
  title           TEXT NOT NULL,
  body            TEXT,
  category        TEXT,
  tags            TEXT[],
  indexed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Quality engine
CREATE TABLE IF NOT EXISTS data_quality_rules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  check_type      TEXT NOT NULL DEFAULT 'invalid_value',
  applies_to      TEXT NOT NULL,
  field_path      TEXT,
  severity        TEXT NOT NULL DEFAULT 'warning',
  score_impact    NUMERIC NOT NULL DEFAULT 5,
  conditions      JSONB NOT NULL DEFAULT '{}',
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS data_quality_issues (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  rule_id         UUID REFERENCES data_quality_rules(id),
  record_type     TEXT NOT NULL,
  record_id       TEXT,
  severity        TEXT NOT NULL DEFAULT 'warning',
  issue_code      TEXT NOT NULL,
  description     TEXT NOT NULL,
  field_path      TEXT,
  status          TEXT NOT NULL DEFAULT 'open',
  fixed_by        UUID,
  fixed_at        TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Approval workflow
CREATE TABLE IF NOT EXISTS approval_workflows (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  applies_to      TEXT NOT NULL,
  stages          JSONB NOT NULL DEFAULT '[]',
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS approval_instances (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  workflow_id     UUID REFERENCES approval_workflows(id),
  record_type     TEXT NOT NULL,
  record_id       TEXT NOT NULL,
  current_stage   INT NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'draft',
  submitted_by    UUID,
  submitted_at    TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  metadata        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS approval_stage_records (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  instance_id       UUID NOT NULL REFERENCES approval_instances(id) ON DELETE CASCADE,
  stage_index       INT NOT NULL,
  stage_name        TEXT NOT NULL,
  action            TEXT NOT NULL,
  actor_id          UUID NOT NULL,
  comment           TEXT,
  rejection_reason  TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Evidence management
CREATE TABLE IF NOT EXISTS evidence_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  evidence_type   TEXT NOT NULL DEFAULT 'photo',
  linked_type     TEXT,
  linked_id       TEXT,
  file_url        TEXT,
  file_size_bytes INT,
  mime_type       TEXT,
  duration_sec    INT,
  gps_lat         NUMERIC,
  gps_lng         NUMERIC,
  gps_accuracy    NUMERIC,
  captured_at     TIMESTAMPTZ,
  version         INT NOT NULL DEFAULT 1,
  tags            TEXT[],
  is_verified     BOOLEAN NOT NULL DEFAULT FALSE,
  verified_by     UUID,
  verified_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Knowledge library
CREATE TABLE IF NOT EXISTS knowledge_categories (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  parent_id       UUID REFERENCES knowledge_categories(id),
  sort_order      INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS knowledge_articles (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  category_id       UUID REFERENCES knowledge_categories(id),
  title             TEXT NOT NULL,
  content           TEXT,
  document_type     TEXT NOT NULL DEFAULT 'article',
  lifecycle_status  TEXT NOT NULL DEFAULT 'draft',
  version           TEXT,
  tags              TEXT[],
  view_count        INT NOT NULL DEFAULT 0,
  published_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tasks
CREATE TABLE IF NOT EXISTS tasks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  description     TEXT,
  task_type       TEXT,
  priority        TEXT NOT NULL DEFAULT 'medium',
  status          TEXT NOT NULL DEFAULT 'pending',
  assigned_to     UUID,
  due_date        TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  completion_notes TEXT,
  tags            TEXT[],
  metadata        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS task_comments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  task_id         UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id         UUID,
  content         TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Observatory
CREATE TABLE IF NOT EXISTS observatory_dashboards (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  geo_level       TEXT,
  widgets         JSONB NOT NULL DEFAULT '[]',
  is_public       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS observatory_alerts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  alert_type      TEXT NOT NULL DEFAULT 'custom',
  severity        TEXT NOT NULL DEFAULT 'medium',
  title           TEXT NOT NULL,
  description     TEXT,
  geo_unit_id     TEXT,
  indicator_id    UUID,
  status          TEXT NOT NULL DEFAULT 'active',
  acknowledged_by UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on all user tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE territories ENABLE ROW LEVEL SECURITY;
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE geometry_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_layers ENABLE ROW LEVEL SECURITY;
ALTER TABLE households ENABLE ROW LEVEL SECURITY;
ALTER TABLE vulnerability_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE indicator_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE indicator_thresholds ENABLE ROW LEVEL SECURITY;
ALTER TABLE indicator_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE diagnostic_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE diagnostic_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendation_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE semaphore_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE semaphore_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE tabulation_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE tabulation_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE score_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE composite_indexes ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE retention_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE archive_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_export_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_index ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_quality_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_quality_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_stage_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE observatory_dashboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE observatory_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
