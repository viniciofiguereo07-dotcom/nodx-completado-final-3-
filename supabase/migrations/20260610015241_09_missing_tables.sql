
-- Additional tables referenced by existing services

-- Territorial corridor memberships (used by TerritorialIntelligenceEngine)
CREATE TABLE IF NOT EXISTS territorial_corridor_memberships (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  corridor_id     UUID NOT NULL,
  entity_id       UUID NOT NULL REFERENCES territorial_entities(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(corridor_id, entity_id)
);

ALTER TABLE territorial_corridor_memberships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tcm_select" ON territorial_corridor_memberships FOR SELECT TO authenticated USING (is_org_member(organization_id));
CREATE POLICY "tcm_insert" ON territorial_corridor_memberships FOR INSERT TO authenticated WITH CHECK (is_org_member(organization_id));
CREATE POLICY "tcm_update" ON territorial_corridor_memberships FOR UPDATE TO authenticated USING (is_org_member(organization_id));
CREATE POLICY "tcm_delete" ON territorial_corridor_memberships FOR DELETE TO authenticated USING (is_org_member(organization_id));

-- Add missing columns to households (registration_date, properties)
ALTER TABLE households ADD COLUMN IF NOT EXISTS registration_date DATE;
ALTER TABLE households ADD COLUMN IF NOT EXISTS territory_id UUID REFERENCES territories(id);
ALTER TABLE households ADD COLUMN IF NOT EXISTS properties JSONB NOT NULL DEFAULT '{}';

-- Add missing columns to wash tables
ALTER TABLE wash_water_points ADD COLUMN IF NOT EXISTS territory_id UUID REFERENCES territories(id);
ALTER TABLE wash_water_points ADD COLUMN IF NOT EXISTS water_quality_score INT;
ALTER TABLE wash_water_points ADD COLUMN IF NOT EXISTS chlorine_residual_mgl NUMERIC;
ALTER TABLE wash_water_points ADD COLUMN IF NOT EXISTS turbidity_ntu NUMERIC;
ALTER TABLE wash_water_points ADD COLUMN IF NOT EXISTS last_tested_at TIMESTAMPTZ;
ALTER TABLE wash_water_points ADD COLUMN IF NOT EXISTS last_maintained_at TIMESTAMPTZ;
ALTER TABLE wash_water_points ADD COLUMN IF NOT EXISTS properties JSONB NOT NULL DEFAULT '{}';

ALTER TABLE wash_sanitation_facilities ADD COLUMN IF NOT EXISTS territory_id UUID REFERENCES territories(id);
ALTER TABLE wash_sanitation_facilities ADD COLUMN IF NOT EXISTS facility_type TEXT;
ALTER TABLE wash_sanitation_facilities ADD COLUMN IF NOT EXISTS has_handwashing BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE wash_sanitation_facilities ADD COLUMN IF NOT EXISTS households_served INT;
ALTER TABLE wash_sanitation_facilities ADD COLUMN IF NOT EXISTS last_cleaned_at TIMESTAMPTZ;
ALTER TABLE wash_sanitation_facilities ADD COLUMN IF NOT EXISTS properties JSONB NOT NULL DEFAULT '{}';

-- Add organization_id-based access to wash and household tables
ALTER TABLE wash_water_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE wash_sanitation_facilities ENABLE ROW LEVEL SECURITY;

-- Add missing indicator_values columns
ALTER TABLE indicator_values ADD COLUMN IF NOT EXISTS period TEXT;

-- Add missing profiles column
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS nodx_access_level INT;
ALTER TABLE platform_bootstrap ADD COLUMN IF NOT EXISTS bootstrapped_node_user_id UUID;

-- Add household_members table
CREATE TABLE IF NOT EXISTS household_members (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  household_id    UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name            TEXT,
  sex             TEXT,
  age_years       INT,
  age_months      INT,
  relationship    TEXT,
  disability      BOOLEAN NOT NULL DEFAULT FALSE,
  education_level TEXT,
  occupation      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE household_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hm_select" ON household_members FOR SELECT TO authenticated USING (is_org_member(organization_id));
CREATE POLICY "hm_insert" ON household_members FOR INSERT TO authenticated WITH CHECK (is_org_member(organization_id));
CREATE POLICY "hm_update" ON household_members FOR UPDATE TO authenticated USING (is_org_member(organization_id));
CREATE POLICY "hm_delete" ON household_members FOR DELETE TO authenticated USING (is_org_member(organization_id));

-- ME indicators
CREATE TABLE IF NOT EXISTS me_indicators (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  code            TEXT,
  sector          TEXT,
  unit_of_measure TEXT,
  direction       TEXT NOT NULL DEFAULT 'higher_better',
  baseline_value  NUMERIC,
  baseline_date   DATE,
  target_value    NUMERIC,
  target_date     DATE,
  disaggregations TEXT[] NOT NULL DEFAULT '{}',
  source_form_id  UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE me_indicators ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mei_select" ON me_indicators FOR SELECT TO authenticated USING (is_org_member(organization_id));
CREATE POLICY "mei_insert" ON me_indicators FOR INSERT TO authenticated WITH CHECK (is_org_member(organization_id));
CREATE POLICY "mei_update" ON me_indicators FOR UPDATE TO authenticated USING (is_org_member(organization_id));
CREATE POLICY "mei_delete" ON me_indicators FOR DELETE TO authenticated USING (is_org_member(organization_id));

-- Fix wash_water_points and wash_sanitation_facilities RLS (already enabled above, just adding policies)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'wash_water_points' AND policyname = 'wwp_select'
  ) THEN
    CREATE POLICY "wwp_select" ON wash_water_points FOR SELECT TO authenticated USING (is_org_member(organization_id));
    CREATE POLICY "wwp_insert" ON wash_water_points FOR INSERT TO authenticated WITH CHECK (is_org_member(organization_id));
    CREATE POLICY "wwp_update" ON wash_water_points FOR UPDATE TO authenticated USING (is_org_member(organization_id));
    CREATE POLICY "wwp_delete" ON wash_water_points FOR DELETE TO authenticated USING (is_org_member(organization_id));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'wash_sanitation_facilities' AND policyname = 'wsf_select'
  ) THEN
    CREATE POLICY "wsf_select" ON wash_sanitation_facilities FOR SELECT TO authenticated USING (is_org_member(organization_id));
    CREATE POLICY "wsf_insert" ON wash_sanitation_facilities FOR INSERT TO authenticated WITH CHECK (is_org_member(organization_id));
    CREATE POLICY "wsf_update" ON wash_sanitation_facilities FOR UPDATE TO authenticated USING (is_org_member(organization_id));
    CREATE POLICY "wsf_delete" ON wash_sanitation_facilities FOR DELETE TO authenticated USING (is_org_member(organization_id));
  END IF;
END $$;
