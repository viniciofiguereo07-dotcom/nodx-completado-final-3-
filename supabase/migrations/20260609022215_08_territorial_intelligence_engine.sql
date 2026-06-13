-- Territorial Intelligence Engine — new tables

CREATE TABLE territorial_coverage_metrics (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  geo_level            TEXT NOT NULL,
  geo_name             TEXT NOT NULL,
  geo_code             TEXT,
  total_establishments INT NOT NULL DEFAULT 0,
  active_establishments INT NOT NULL DEFAULT 0,
  assigned_establishments INT NOT NULL DEFAULT 0,
  visited_establishments INT NOT NULL DEFAULT 0,
  coverage_pct         DECIMAL(5,2),
  calculated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_territorial_coverage_org ON territorial_coverage_metrics(organization_id);
CREATE INDEX idx_territorial_coverage_level ON territorial_coverage_metrics(geo_level);
CREATE INDEX idx_territorial_coverage_name ON territorial_coverage_metrics(geo_name);

CREATE TABLE territorial_density_metrics (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  geo_level             TEXT NOT NULL,
  geo_name              TEXT NOT NULL,
  geo_code              TEXT,
  establishment_count   INT NOT NULL DEFAULT 0,
  area_km2              DECIMAL(10,2),
  density_per_km2       DECIMAL(8,2),
  density_class         TEXT CHECK (density_class IN ('low', 'normal', 'saturated')),
  calculated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_territorial_density_org ON territorial_density_metrics(organization_id);
CREATE INDEX idx_territorial_density_level ON territorial_density_metrics(geo_level);
CREATE INDEX idx_territorial_density_class ON territorial_density_metrics(density_class);

CREATE TABLE territorial_opportunity_metrics (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  geo_level             TEXT NOT NULL,
  geo_name              TEXT NOT NULL,
  geo_code              TEXT,
  opportunity_type      TEXT NOT NULL CHECK (opportunity_type IN ('growth_zone', 'underserved_zone', 'expansion_zone')),
  current_establishments INT NOT NULL DEFAULT 0,
  estimated_potential   DECIMAL(5,2),
  confidence_score      DECIMAL(5,2),
  evidence              JSONB NOT NULL DEFAULT '{}',
  calculated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_territorial_opportunity_org ON territorial_opportunity_metrics(organization_id);
CREATE INDEX idx_territorial_opportunity_type ON territorial_opportunity_metrics(opportunity_type);
CREATE INDEX idx_territorial_opportunity_level ON territorial_opportunity_metrics(geo_level);

CREATE TABLE territorial_gap_analysis (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  geo_level             TEXT NOT NULL,
  geo_name              TEXT NOT NULL,
  geo_code              TEXT,
  gap_type              TEXT NOT NULL CHECK (gap_type IN ('coverage_gap', 'density_gap', 'assignment_gap', 'visit_gap')),
  current_value         DECIMAL(8,2),
  expected_value        DECIMAL(8,2),
  gap_pct               DECIMAL(5,2),
  severity              TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  recommendations       JSONB NOT NULL DEFAULT '[]',
  calculated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_territorial_gap_org ON territorial_gap_analysis(organization_id);
CREATE INDEX idx_territorial_gap_type ON territorial_gap_analysis(gap_type);
CREATE INDEX idx_territorial_gap_severity ON territorial_gap_analysis(severity);

-- RLS
ALTER TABLE territorial_coverage_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE territorial_density_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE territorial_opportunity_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE territorial_gap_analysis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_territorial_coverage_metrics" ON territorial_coverage_metrics FOR SELECT TO authenticated USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE));
CREATE POLICY "insert_own_territorial_coverage_metrics" ON territorial_coverage_metrics FOR INSERT TO authenticated WITH CHECK (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE));
CREATE POLICY "update_own_territorial_coverage_metrics" ON territorial_coverage_metrics FOR UPDATE TO authenticated USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE)) WITH CHECK (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE));
CREATE POLICY "delete_own_territorial_coverage_metrics" ON territorial_coverage_metrics FOR DELETE TO authenticated USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE));

CREATE POLICY "select_own_territorial_density_metrics" ON territorial_density_metrics FOR SELECT TO authenticated USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE));
CREATE POLICY "insert_own_territorial_density_metrics" ON territorial_density_metrics FOR INSERT TO authenticated WITH CHECK (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE));
CREATE POLICY "update_own_territorial_density_metrics" ON territorial_density_metrics FOR UPDATE TO authenticated USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE)) WITH CHECK (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE));
CREATE POLICY "delete_own_territorial_density_metrics" ON territorial_density_metrics FOR DELETE TO authenticated USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE));

CREATE POLICY "select_own_territorial_opportunity_metrics" ON territorial_opportunity_metrics FOR SELECT TO authenticated USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE));
CREATE POLICY "insert_own_territorial_opportunity_metrics" ON territorial_opportunity_metrics FOR INSERT TO authenticated WITH CHECK (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE));
CREATE POLICY "update_own_territorial_opportunity_metrics" ON territorial_opportunity_metrics FOR UPDATE TO authenticated USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE)) WITH CHECK (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE));
CREATE POLICY "delete_own_territorial_opportunity_metrics" ON territorial_opportunity_metrics FOR DELETE TO authenticated USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE));

CREATE POLICY "select_own_territorial_gap_analysis" ON territorial_gap_analysis FOR SELECT TO authenticated USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE));
CREATE POLICY "insert_own_territorial_gap_analysis" ON territorial_gap_analysis FOR INSERT TO authenticated WITH CHECK (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE));
CREATE POLICY "update_own_territorial_gap_analysis" ON territorial_gap_analysis FOR UPDATE TO authenticated USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE)) WITH CHECK (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE));
CREATE POLICY "delete_own_territorial_gap_analysis" ON territorial_gap_analysis FOR DELETE TO authenticated USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE));