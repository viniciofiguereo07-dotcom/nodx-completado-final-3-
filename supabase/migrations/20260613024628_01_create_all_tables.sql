-- Core tables for NODX Platform Bootstrap

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

-- Indicator engine
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
  project_id      UUID,
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
ALTER TABLE geographic_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE geographic_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE indicator_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE indicator_thresholds ENABLE ROW LEVEL SECURITY;
ALTER TABLE indicator_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE households ENABLE ROW LEVEL SECURITY;
ALTER TABLE wash_water_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE wash_sanitation_facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE diagnostic_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE diagnostic_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE semaphore_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE semaphore_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE tabulation_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE tabulation_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE score_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "profiles_select" ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_insert" ON profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update" ON profiles FOR UPDATE TO authenticated USING (id = auth.uid());

-- RLS Policies for organizations
CREATE POLICY "organizations_select" ON organizations FOR SELECT TO authenticated USING (true);
CREATE POLICY "organizations_insert" ON organizations FOR INSERT TO authenticated WITH CHECK (true);

-- RLS Policies for organization_members
CREATE POLICY "org_members_select" ON organization_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "org_members_insert" ON organization_members FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "org_members_update" ON organization_members FOR UPDATE TO authenticated USING (true);
CREATE POLICY "org_members_delete" ON organization_members FOR DELETE TO authenticated USING (true);

-- Helper function for organization membership checks
CREATE OR REPLACE FUNCTION is_org_member(org_id UUID) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM organization_members 
    WHERE organization_id = org_id AND user_id = auth.uid() AND is_active = TRUE
  ) OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND organization_id = org_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- RLS Policies for territories
CREATE POLICY "territories_select" ON territories FOR SELECT TO authenticated USING (is_org_member(organization_id));
CREATE POLICY "territories_insert" ON territories FOR INSERT TO authenticated WITH CHECK (is_org_member(organization_id));
CREATE POLICY "territories_update" ON territories FOR UPDATE TO authenticated USING (is_org_member(organization_id));
CREATE POLICY "territories_delete" ON territories FOR DELETE TO authenticated USING (is_org_member(organization_id));

-- RLS Policies for routes
CREATE POLICY "routes_select" ON routes FOR SELECT TO authenticated USING (is_org_member(organization_id));
CREATE POLICY "routes_insert" ON routes FOR INSERT TO authenticated WITH CHECK (is_org_member(organization_id));
CREATE POLICY "routes_update" ON routes FOR UPDATE TO authenticated USING (is_org_member(organization_id));
CREATE POLICY "routes_delete" ON routes FOR DELETE TO authenticated USING (is_org_member(organization_id));

-- RLS Policies for visits
CREATE POLICY "visits_select" ON visits FOR SELECT TO authenticated USING (is_org_member(organization_id));
CREATE POLICY "visits_insert" ON visits FOR INSERT TO authenticated WITH CHECK (is_org_member(organization_id));
CREATE POLICY "visits_update" ON visits FOR UPDATE TO authenticated USING (is_org_member(organization_id));
CREATE POLICY "visits_delete" ON visits FOR DELETE TO authenticated USING (is_org_member(organization_id));

-- RLS Policies for other tables using is_org_member
CREATE POLICY "form_templates_select" ON form_templates FOR SELECT TO authenticated USING (is_org_member(organization_id));
CREATE POLICY "form_templates_insert" ON form_templates FOR INSERT TO authenticated WITH CHECK (is_org_member(organization_id));
CREATE POLICY "form_templates_update" ON form_templates FOR UPDATE TO authenticated USING (is_org_member(organization_id));
CREATE POLICY "form_templates_delete" ON form_templates FOR DELETE TO authenticated USING (is_org_member(organization_id));

CREATE POLICY "form_submissions_select" ON form_submissions FOR SELECT TO authenticated USING (is_org_member(organization_id));
CREATE POLICY "form_submissions_insert" ON form_submissions FOR INSERT TO authenticated WITH CHECK (is_org_member(organization_id));
CREATE POLICY "form_submissions_update" ON form_submissions FOR UPDATE TO authenticated USING (is_org_member(organization_id));
CREATE POLICY "form_submissions_delete" ON form_submissions FOR DELETE TO authenticated USING (is_org_member(organization_id));

CREATE POLICY "inventory_items_select" ON inventory_items FOR SELECT TO authenticated USING (is_org_member(organization_id));
CREATE POLICY "inventory_items_insert" ON inventory_items FOR INSERT TO authenticated WITH CHECK (is_org_member(organization_id));
CREATE POLICY "inventory_items_update" ON inventory_items FOR UPDATE TO authenticated USING (is_org_member(organization_id));
CREATE POLICY "inventory_items_delete" ON inventory_items FOR DELETE TO authenticated USING (is_org_member(organization_id));

CREATE POLICY "tasks_select" ON tasks FOR SELECT TO authenticated USING (is_org_member(organization_id));
CREATE POLICY "tasks_insert" ON tasks FOR INSERT TO authenticated WITH CHECK (is_org_member(organization_id));
CREATE POLICY "tasks_update" ON tasks FOR UPDATE TO authenticated USING (is_org_member(organization_id));
CREATE POLICY "tasks_delete" ON tasks FOR DELETE TO authenticated USING (is_org_member(organization_id));

CREATE POLICY "workflows_select" ON workflows FOR SELECT TO authenticated USING (is_org_member(organization_id));
CREATE POLICY "workflows_insert" ON workflows FOR INSERT TO authenticated WITH CHECK (is_org_member(organization_id));
CREATE POLICY "workflows_update" ON workflows FOR UPDATE TO authenticated USING (is_org_member(organization_id));
CREATE POLICY "workflows_delete" ON workflows FOR DELETE TO authenticated USING (is_org_member(organization_id));

CREATE POLICY "workflow_executions_select" ON workflow_executions FOR SELECT TO authenticated USING (is_org_member(organization_id));
CREATE POLICY "workflow_executions_insert" ON workflow_executions FOR INSERT TO authenticated WITH CHECK (is_org_member(organization_id));
CREATE POLICY "workflow_executions_update" ON workflow_executions FOR UPDATE TO authenticated USING (is_org_member(organization_id));

CREATE POLICY "ai_queries_select" ON ai_queries FOR SELECT TO authenticated USING (is_org_member(organization_id));
CREATE POLICY "ai_queries_insert" ON ai_queries FOR INSERT TO authenticated WITH CHECK (is_org_member(organization_id));
CREATE POLICY "ai_queries_update" ON ai_queries FOR UPDATE TO authenticated USING (is_org_member(organization_id));

CREATE POLICY "ai_insights_select" ON ai_insights FOR SELECT TO authenticated USING (is_org_member(organization_id));
CREATE POLICY "ai_insights_insert" ON ai_insights FOR INSERT TO authenticated WITH CHECK (is_org_member(organization_id));
CREATE POLICY "ai_insights_update" ON ai_insights FOR UPDATE TO authenticated USING (is_org_member(organization_id));
CREATE POLICY "ai_insights_delete" ON ai_insights FOR DELETE TO authenticated USING (is_org_member(organization_id));

CREATE POLICY "geometry_features_select" ON geometry_features FOR SELECT TO authenticated USING (is_org_member(organization_id));
CREATE POLICY "geometry_features_insert" ON geometry_features FOR INSERT TO authenticated WITH CHECK (is_org_member(organization_id));
CREATE POLICY "geometry_features_update" ON geometry_features FOR UPDATE TO authenticated USING (is_org_member(organization_id));
CREATE POLICY "geometry_features_delete" ON geometry_features FOR DELETE TO authenticated USING (is_org_member(organization_id));

CREATE POLICY "risk_layers_select" ON risk_layers FOR SELECT TO authenticated USING (is_org_member(organization_id));
CREATE POLICY "risk_layers_insert" ON risk_layers FOR INSERT TO authenticated WITH CHECK (is_org_member(organization_id));
CREATE POLICY "risk_layers_update" ON risk_layers FOR UPDATE TO authenticated USING (is_org_member(organization_id));
CREATE POLICY "risk_layers_delete" ON risk_layers FOR DELETE TO authenticated USING (is_org_member(organization_id));

CREATE POLICY "diagnostic_rules_select" ON diagnostic_rules FOR SELECT TO authenticated USING (is_org_member(organization_id));
CREATE POLICY "diagnostic_rules_insert" ON diagnostic_rules FOR INSERT TO authenticated WITH CHECK (is_org_member(organization_id));
CREATE POLICY "diagnostic_rules_update" ON diagnostic_rules FOR UPDATE TO authenticated USING (is_org_member(organization_id));
CREATE POLICY "diagnostic_rules_delete" ON diagnostic_rules FOR DELETE TO authenticated USING (is_org_member(organization_id));

CREATE POLICY "diagnostic_results_select" ON diagnostic_results FOR SELECT TO authenticated USING (is_org_member(organization_id));
CREATE POLICY "diagnostic_results_insert" ON diagnostic_results FOR INSERT TO authenticated WITH CHECK (is_org_member(organization_id));
CREATE POLICY "diagnostic_results_update" ON diagnostic_results FOR UPDATE TO authenticated USING (is_org_member(organization_id));

CREATE POLICY "semaphore_rules_select" ON semaphore_rules FOR SELECT TO authenticated USING (is_org_member(organization_id));
CREATE POLICY "semaphore_rules_insert" ON semaphore_rules FOR INSERT TO authenticated WITH CHECK (is_org_member(organization_id));
CREATE POLICY "semaphore_rules_update" ON semaphore_rules FOR UPDATE TO authenticated USING (is_org_member(organization_id));
CREATE POLICY "semaphore_rules_delete" ON semaphore_rules FOR DELETE TO authenticated USING (is_org_member(organization_id));

CREATE POLICY "semaphore_results_select" ON semaphore_results FOR SELECT TO authenticated USING (is_org_member(organization_id));
CREATE POLICY "semaphore_results_insert" ON semaphore_results FOR INSERT TO authenticated WITH CHECK (is_org_member(organization_id));
CREATE POLICY "semaphore_results_update" ON semaphore_results FOR UPDATE TO authenticated USING (is_org_member(organization_id));

CREATE POLICY "tabulation_configs_select" ON tabulation_configs FOR SELECT TO authenticated USING (is_org_member(organization_id));
CREATE POLICY "tabulation_configs_insert" ON tabulation_configs FOR INSERT TO authenticated WITH CHECK (is_org_member(organization_id));
CREATE POLICY "tabulation_configs_update" ON tabulation_configs FOR UPDATE TO authenticated USING (is_org_member(organization_id));
CREATE POLICY "tabulation_configs_delete" ON tabulation_configs FOR DELETE TO authenticated USING (is_org_member(organization_id));

CREATE POLICY "tabulation_results_select" ON tabulation_results FOR SELECT TO authenticated USING (is_org_member(organization_id));
CREATE POLICY "tabulation_results_insert" ON tabulation_results FOR INSERT TO authenticated WITH CHECK (is_org_member(organization_id));
CREATE POLICY "tabulation_results_update" ON tabulation_results FOR UPDATE TO authenticated USING (is_org_member(organization_id));

CREATE POLICY "programs_select" ON programs FOR SELECT TO authenticated USING (is_org_member(org_id));
CREATE POLICY "programs_insert" ON programs FOR INSERT TO authenticated WITH CHECK (is_org_member(org_id));
CREATE POLICY "programs_update" ON programs FOR UPDATE TO authenticated USING (is_org_member(org_id));
CREATE POLICY "programs_delete" ON programs FOR DELETE TO authenticated USING (is_org_member(org_id));

CREATE POLICY "projects_select" ON projects FOR SELECT TO authenticated USING (is_org_member(org_id));
CREATE POLICY "projects_insert" ON projects FOR INSERT TO authenticated WITH CHECK (is_org_member(org_id));
CREATE POLICY "projects_update" ON projects FOR UPDATE TO authenticated USING (is_org_member(org_id));
CREATE POLICY "projects_delete" ON projects FOR DELETE TO authenticated USING (is_org_member(org_id));

CREATE POLICY "activities_select" ON activities FOR SELECT TO authenticated USING (is_org_member(org_id));
CREATE POLICY "activities_insert" ON activities FOR INSERT TO authenticated WITH CHECK (is_org_member(org_id));
CREATE POLICY "activities_update" ON activities FOR UPDATE TO authenticated USING (is_org_member(org_id));
CREATE POLICY "activities_delete" ON activities FOR DELETE TO authenticated USING (is_org_member(org_id));

CREATE POLICY "households_select" ON households FOR SELECT TO authenticated USING (is_org_member(organization_id));
CREATE POLICY "households_insert" ON households FOR INSERT TO authenticated WITH CHECK (is_org_member(organization_id));
CREATE POLICY "households_update" ON households FOR UPDATE TO authenticated USING (is_org_member(organization_id));
CREATE POLICY "households_delete" ON households FOR DELETE TO authenticated USING (is_org_member(organization_id));

CREATE POLICY "wash_water_points_select" ON wash_water_points FOR SELECT TO authenticated USING (is_org_member(organization_id));
CREATE POLICY "wash_water_points_insert" ON wash_water_points FOR INSERT TO authenticated WITH CHECK (is_org_member(organization_id));
CREATE POLICY "wash_water_points_update" ON wash_water_points FOR UPDATE TO authenticated USING (is_org_member(organization_id));
CREATE POLICY "wash_water_points_delete" ON wash_water_points FOR DELETE TO authenticated USING (is_org_member(organization_id));

CREATE POLICY "wash_sanitation_facilities_select" ON wash_sanitation_facilities FOR SELECT TO authenticated USING (is_org_member(organization_id));
CREATE POLICY "wash_sanitation_facilities_insert" ON wash_sanitation_facilities FOR INSERT TO authenticated WITH CHECK (is_org_member(organization_id));
CREATE POLICY "wash_sanitation_facilities_update" ON wash_sanitation_facilities FOR UPDATE TO authenticated USING (is_org_member(organization_id));
CREATE POLICY "wash_sanitation_facilities_delete" ON wash_sanitation_facilities FOR DELETE TO authenticated USING (is_org_member(organization_id));

CREATE POLICY "indicator_catalog_select" ON indicator_catalog FOR SELECT TO authenticated USING (true);
CREATE POLICY "indicator_catalog_insert" ON indicator_catalog FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "indicator_catalog_update" ON indicator_catalog FOR UPDATE TO authenticated USING (true);

CREATE POLICY "indicator_values_select" ON indicator_values FOR SELECT TO authenticated USING (is_org_member(organization_id));
CREATE POLICY "indicator_values_insert" ON indicator_values FOR INSERT TO authenticated WITH CHECK (is_org_member(organization_id));
CREATE POLICY "indicator_values_update" ON indicator_values FOR UPDATE TO authenticated USING (is_org_member(organization_id));

CREATE POLICY "access_events_select" ON access_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "access_events_insert" ON access_events FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "audit_logs_select" ON audit_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "audit_logs_insert" ON audit_logs FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "sync_queue_select" ON sync_queue FOR SELECT TO authenticated USING (is_org_member(organization_id));
CREATE POLICY "sync_queue_insert" ON sync_queue FOR INSERT TO authenticated WITH CHECK (is_org_member(organization_id));
CREATE POLICY "sync_queue_update" ON sync_queue FOR UPDATE TO authenticated USING (is_org_member(organization_id));
CREATE POLICY "sync_queue_delete" ON sync_queue FOR DELETE TO authenticated USING (is_org_member(organization_id));

CREATE POLICY "licenses_select" ON licenses FOR SELECT TO authenticated USING (is_org_member(organization_id));
CREATE POLICY "licenses_insert" ON licenses FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "licenses_update" ON licenses FOR UPDATE TO authenticated USING (true);

CREATE POLICY "organization_modules_select" ON organization_modules FOR SELECT TO authenticated USING (is_org_member(organization_id));
CREATE POLICY "organization_modules_insert" ON organization_modules FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "organization_modules_update" ON organization_modules FOR UPDATE TO authenticated USING (true);

CREATE POLICY "geographic_levels_select" ON geographic_levels FOR SELECT TO authenticated USING (true);
CREATE POLICY "geographic_levels_insert" ON geographic_levels FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "geographic_units_select" ON geographic_units FOR SELECT TO authenticated USING (true);
CREATE POLICY "geographic_units_insert" ON geographic_units FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "geographic_units_update" ON geographic_units FOR UPDATE TO authenticated USING (true);

CREATE POLICY "permissions_select" ON permissions FOR SELECT TO authenticated USING (true);