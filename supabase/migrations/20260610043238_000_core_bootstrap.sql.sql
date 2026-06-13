-- Core bootstrap tables
CREATE TABLE IF NOT EXISTS profiles (
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

-- Helper function for RLS
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

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "profiles_select" ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_insert" ON profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update" ON profiles FOR UPDATE TO authenticated USING (id = auth.uid());

CREATE POLICY "organizations_select" ON organizations FOR SELECT TO authenticated USING (
  id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE)
  OR id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
);
CREATE POLICY "organizations_insert" ON organizations FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "org_members_select" ON organization_members FOR SELECT TO authenticated USING (
  user_id = auth.uid() 
  OR organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "org_members_insert" ON organization_members FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "org_members_update" ON organization_members FOR UPDATE TO authenticated USING (true);
CREATE POLICY "org_members_delete" ON organization_members FOR DELETE TO authenticated USING (true);

-- Territory tables
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

ALTER TABLE territories ENABLE ROW LEVEL SECURITY;
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "territories_select" ON territories FOR SELECT TO authenticated USING (is_org_member(organization_id));
CREATE POLICY "territories_insert" ON territories FOR INSERT TO authenticated WITH CHECK (is_org_member(organization_id));
CREATE POLICY "territories_update" ON territories FOR UPDATE TO authenticated USING (is_org_member(organization_id));
CREATE POLICY "territories_delete" ON territories FOR DELETE TO authenticated USING (is_org_member(organization_id));

CREATE POLICY "routes_select" ON routes FOR SELECT TO authenticated USING (is_org_member(organization_id));
CREATE POLICY "routes_insert" ON routes FOR INSERT TO authenticated WITH CHECK (is_org_member(organization_id));
CREATE POLICY "routes_update" ON routes FOR UPDATE TO authenticated USING (is_org_member(organization_id));
CREATE POLICY "routes_delete" ON routes FOR DELETE TO authenticated USING (is_org_member(organization_id));

CREATE POLICY "visits_select" ON visits FOR SELECT TO authenticated USING (is_org_member(organization_id));
CREATE POLICY "visits_insert" ON visits FOR INSERT TO authenticated WITH CHECK (is_org_member(organization_id));
CREATE POLICY "visits_update" ON visits FOR UPDATE TO authenticated USING (is_org_member(organization_id));
CREATE POLICY "visits_delete" ON visits FOR DELETE TO authenticated USING (is_org_member(organization_id));

-- Territorial entities (master registry)
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

ALTER TABLE territorial_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE territorial_owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE territorial_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE territorial_classifications ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t TEXT;
tables TEXT[] := ARRAY['territorial_entities', 'territorial_owners', 'territorial_locations', 'territorial_classifications'];
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