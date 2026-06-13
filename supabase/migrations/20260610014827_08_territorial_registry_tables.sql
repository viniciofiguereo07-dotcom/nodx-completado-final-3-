
-- Territorial Master Registry
CREATE TABLE IF NOT EXISTS territorial_entities (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  nodx_uid        TEXT NOT NULL,
  business_name   TEXT NOT NULL,
  commercial_name TEXT,
  legal_name      TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_by      UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, nodx_uid)
);

CREATE TABLE IF NOT EXISTS territorial_owners (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  entity_id       UUID NOT NULL REFERENCES territorial_entities(id) ON DELETE CASCADE UNIQUE,
  name            TEXT NOT NULL,
  known_name      TEXT,
  phone           TEXT,
  mobile          TEXT,
  whatsapp        TEXT,
  email           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS territorial_locations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  entity_id       UUID NOT NULL REFERENCES territorial_entities(id) ON DELETE CASCADE UNIQUE,
  country         TEXT,
  province        TEXT,
  municipality    TEXT,
  district        TEXT,
  sector          TEXT,
  neighborhood    TEXT,
  address         TEXT,
  latitude        NUMERIC,
  longitude       NUMERIC,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS territorial_classifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  entity_id       UUID NOT NULL REFERENCES territorial_entities(id) ON DELETE CASCADE UNIQUE,
  business_type   TEXT,
  size            TEXT,
  potential       TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS territorial_operations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  entity_id       UUID NOT NULL REFERENCES territorial_entities(id) ON DELETE CASCADE,
  operation_type  TEXT NOT NULL,
  operation_role  TEXT NOT NULL,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS territorial_assignments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  entity_id       UUID NOT NULL REFERENCES territorial_entities(id) ON DELETE CASCADE,
  user_id         UUID,
  route_id        UUID REFERENCES routes(id),
  corridor_id     UUID,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  assigned_by     UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS territorial_potential_scores (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  entity_id         UUID NOT NULL REFERENCES territorial_entities(id) ON DELETE CASCADE UNIQUE,
  potential_score   NUMERIC NOT NULL DEFAULT 0,
  confidence_score  NUMERIC NOT NULL DEFAULT 0,
  last_calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS territorial_visit_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  entity_id       UUID NOT NULL REFERENCES territorial_entities(id) ON DELETE CASCADE,
  visit_id        UUID REFERENCES visits(id),
  visited_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Territorial Intelligence Engine
CREATE TABLE IF NOT EXISTS territorial_coverage_metrics (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id         UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  geo_level               TEXT NOT NULL,
  geo_name                TEXT NOT NULL,
  geo_code                TEXT,
  total_establishments    INT NOT NULL DEFAULT 0,
  active_establishments   INT NOT NULL DEFAULT 0,
  assigned_establishments INT NOT NULL DEFAULT 0,
  visited_establishments  INT NOT NULL DEFAULT 0,
  coverage_pct            NUMERIC,
  calculated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, geo_level, geo_name)
);

CREATE TABLE IF NOT EXISTS territorial_density_metrics (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  geo_level           TEXT NOT NULL,
  geo_name            TEXT NOT NULL,
  geo_code            TEXT,
  establishment_count INT NOT NULL DEFAULT 0,
  area_km2            NUMERIC,
  density_per_km2     NUMERIC,
  density_class       TEXT,
  calculated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, geo_level, geo_name)
);

CREATE TABLE IF NOT EXISTS territorial_opportunity_metrics (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id         UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  geo_level               TEXT NOT NULL,
  geo_name                TEXT NOT NULL,
  geo_code                TEXT,
  opportunity_type        TEXT NOT NULL,
  current_establishments  INT NOT NULL DEFAULT 0,
  estimated_potential     NUMERIC,
  confidence_score        NUMERIC,
  evidence                JSONB NOT NULL DEFAULT '{}',
  calculated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS territorial_gap_analysis (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  geo_level       TEXT NOT NULL,
  geo_name        TEXT NOT NULL,
  geo_code        TEXT,
  gap_type        TEXT NOT NULL,
  current_value   NUMERIC,
  expected_value  NUMERIC,
  gap_pct         NUMERIC,
  severity        TEXT,
  recommendations JSONB NOT NULL DEFAULT '[]',
  calculated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE territorial_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE territorial_owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE territorial_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE territorial_classifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE territorial_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE territorial_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE territorial_potential_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE territorial_visit_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE territorial_coverage_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE territorial_density_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE territorial_opportunity_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE territorial_gap_analysis ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t TEXT;
tables TEXT[] := ARRAY[
  'territorial_entities','territorial_owners','territorial_locations',
  'territorial_classifications','territorial_operations','territorial_assignments',
  'territorial_potential_scores','territorial_visit_history',
  'territorial_coverage_metrics','territorial_density_metrics',
  'territorial_opportunity_metrics','territorial_gap_analysis'
];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('
      CREATE POLICY "%s_select" ON %I FOR SELECT TO authenticated USING (is_org_member(organization_id));
      CREATE POLICY "%s_insert" ON %I FOR INSERT TO authenticated WITH CHECK (is_org_member(organization_id));
      CREATE POLICY "%s_update" ON %I FOR UPDATE TO authenticated USING (is_org_member(organization_id));
      CREATE POLICY "%s_delete" ON %I FOR DELETE TO authenticated USING (is_org_member(organization_id));
    ', t, t, t, t, t, t, t, t);
  END LOOP;
END $$;
