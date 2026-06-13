-- ============================================================
-- Territorial Master Registry — Database Foundation
-- Migration 07
-- ============================================================

-- ----------------------------------------------------------
-- 1. territorial_entities — Core entity record
-- ----------------------------------------------------------
CREATE TABLE territorial_entities (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  nodx_uid          TEXT NOT NULL,
  business_name     TEXT NOT NULL,
  commercial_name   TEXT,
  legal_name        TEXT,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_by        UUID,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, nodx_uid)
);

CREATE INDEX idx_territorial_entities_org    ON territorial_entities(organization_id);
CREATE INDEX idx_territorial_entities_uid    ON territorial_entities(nodx_uid);
CREATE INDEX idx_territorial_entities_active ON territorial_entities(is_active);

-- ----------------------------------------------------------
-- 2. territorial_owners — Owner contact info
-- ----------------------------------------------------------
CREATE TABLE territorial_owners (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  entity_id         UUID NOT NULL REFERENCES territorial_entities(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  known_name        TEXT,
  phone             TEXT,
  mobile            TEXT,
  whatsapp          TEXT,
  email             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_territorial_owners_org    ON territorial_owners(organization_id);
CREATE INDEX idx_territorial_owners_entity ON territorial_owners(entity_id);

-- ----------------------------------------------------------
-- 3. territorial_locations — Geographic hierarchy
-- ----------------------------------------------------------
CREATE TABLE territorial_locations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  entity_id         UUID NOT NULL REFERENCES territorial_entities(id) ON DELETE CASCADE,
  country           TEXT,
  province          TEXT,
  municipality      TEXT,
  district          TEXT,
  sector            TEXT,
  neighborhood      TEXT,
  address           TEXT,
  latitude          DOUBLE PRECISION,
  longitude         DOUBLE PRECISION,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_territorial_locations_org       ON territorial_locations(organization_id);
CREATE INDEX idx_territorial_locations_entity    ON territorial_locations(entity_id);
CREATE INDEX idx_territorial_locations_coords    ON territorial_locations(latitude, longitude);
CREATE INDEX idx_territorial_locations_province  ON territorial_locations(province);
CREATE INDEX idx_territorial_locations_municipality ON territorial_locations(municipality);

-- ----------------------------------------------------------
-- 4. territorial_classifications — Business type / size / potential
-- ----------------------------------------------------------
CREATE TABLE territorial_classifications (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  entity_id         UUID NOT NULL REFERENCES territorial_entities(id) ON DELETE CASCADE,
  business_type     TEXT,
  size              TEXT CHECK (size IN ('micro', 'small', 'medium', 'large')),
  potential         TEXT CHECK (potential IN ('low', 'medium', 'high')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_territorial_classifications_org       ON territorial_classifications(organization_id);
CREATE INDEX idx_territorial_classifications_entity    ON territorial_classifications(entity_id);
CREATE INDEX idx_territorial_classifications_type      ON territorial_classifications(business_type);
CREATE INDEX idx_territorial_classifications_potential ON territorial_classifications(potential);

-- ----------------------------------------------------------
-- 5. territorial_operations — Operation context
-- ----------------------------------------------------------
CREATE TABLE territorial_operations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  entity_id         UUID NOT NULL REFERENCES territorial_entities(id) ON DELETE CASCADE,
  operation_type    TEXT NOT NULL DEFAULT 'commercial',
  operation_role    TEXT NOT NULL,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_territorial_operations_org    ON territorial_operations(organization_id);
CREATE INDEX idx_territorial_operations_entity ON territorial_operations(entity_id);
CREATE INDEX idx_territorial_operations_type   ON territorial_operations(operation_type);

-- ----------------------------------------------------------
-- 6. territorial_assignments — User / route / corridor assignments
-- ----------------------------------------------------------
CREATE TABLE territorial_assignments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  entity_id         UUID NOT NULL REFERENCES territorial_entities(id) ON DELETE CASCADE,
  user_id           UUID,
  route_id          UUID,
  corridor_id       UUID,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  assigned_by       UUID,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_territorial_assignments_org      ON territorial_assignments(organization_id);
CREATE INDEX idx_territorial_assignments_entity   ON territorial_assignments(entity_id);
CREATE INDEX idx_territorial_assignments_user     ON territorial_assignments(user_id);
CREATE INDEX idx_territorial_assignments_route    ON territorial_assignments(route_id);
CREATE INDEX idx_territorial_assignments_corridor ON territorial_assignments(corridor_id);
CREATE INDEX idx_territorial_assignments_active   ON territorial_assignments(is_active);

-- ----------------------------------------------------------
-- 7. territorial_visit_history — Visit records
-- ----------------------------------------------------------
CREATE TABLE territorial_visit_history (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  entity_id         UUID NOT NULL REFERENCES territorial_entities(id) ON DELETE CASCADE,
  visit_date        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id           UUID,
  status            TEXT NOT NULL DEFAULT 'completed',
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_territorial_visit_history_org    ON territorial_visit_history(organization_id);
CREATE INDEX idx_territorial_visit_history_entity ON territorial_visit_history(entity_id);
CREATE INDEX idx_territorial_visit_history_date   ON territorial_visit_history(visit_date DESC);
CREATE INDEX idx_territorial_visit_history_status ON territorial_visit_history(status);

-- ----------------------------------------------------------
-- 8. territorial_route_memberships — Route <-> Entity link
-- ----------------------------------------------------------
CREATE TABLE territorial_route_memberships (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  entity_id         UUID NOT NULL REFERENCES territorial_entities(id) ON DELETE CASCADE,
  route_id          UUID NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(route_id, entity_id)
);

CREATE INDEX idx_territorial_route_memberships_org    ON territorial_route_memberships(organization_id);
CREATE INDEX idx_territorial_route_memberships_entity ON territorial_route_memberships(entity_id);
CREATE INDEX idx_territorial_route_memberships_route  ON territorial_route_memberships(route_id);

-- ----------------------------------------------------------
-- 9. territorial_corridor_memberships — Corridor <-> Entity link
-- ----------------------------------------------------------
CREATE TABLE territorial_corridor_memberships (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  entity_id         UUID NOT NULL REFERENCES territorial_entities(id) ON DELETE CASCADE,
  corridor_id       UUID NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(corridor_id, entity_id)
);

CREATE INDEX idx_territorial_corridor_memberships_org      ON territorial_corridor_memberships(organization_id);
CREATE INDEX idx_territorial_corridor_memberships_entity   ON territorial_corridor_memberships(entity_id);
CREATE INDEX idx_territorial_corridor_memberships_corridor ON territorial_corridor_memberships(corridor_id);

-- ----------------------------------------------------------
-- 10. territorial_geometries — GeoJSON storage
-- ----------------------------------------------------------
CREATE TABLE territorial_geometries (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  entity_id         UUID NOT NULL REFERENCES territorial_entities(id) ON DELETE CASCADE,
  geometry_type     TEXT NOT NULL DEFAULT 'point',
  geojson           JSONB NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_territorial_geometries_org    ON territorial_geometries(organization_id);
CREATE INDEX idx_territorial_geometries_entity ON territorial_geometries(entity_id);
CREATE INDEX idx_territorial_geometries_type   ON territorial_geometries(geometry_type);

-- ----------------------------------------------------------
-- 11. territorial_potential_scores — Scoring data
-- ----------------------------------------------------------
CREATE TABLE territorial_potential_scores (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  entity_id              UUID NOT NULL REFERENCES territorial_entities(id) ON DELETE CASCADE,
  potential_score        DECIMAL(5,2),
  confidence_score       DECIMAL(5,2),
  last_calculated_at     TIMESTAMPTZ,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_territorial_potential_scores_org    ON territorial_potential_scores(organization_id);
CREATE INDEX idx_territorial_potential_scores_entity ON territorial_potential_scores(entity_id);

-- ============================================================
-- RLS — Enable on all 11 tables
-- ============================================================
ALTER TABLE territorial_entities              ENABLE ROW LEVEL SECURITY;
ALTER TABLE territorial_owners                ENABLE ROW LEVEL SECURITY;
ALTER TABLE territorial_locations             ENABLE ROW LEVEL SECURITY;
ALTER TABLE territorial_classifications       ENABLE ROW LEVEL SECURITY;
ALTER TABLE territorial_operations            ENABLE ROW LEVEL SECURITY;
ALTER TABLE territorial_assignments           ENABLE ROW LEVEL SECURITY;
ALTER TABLE territorial_visit_history         ENABLE ROW LEVEL SECURITY;
ALTER TABLE territorial_route_memberships     ENABLE ROW LEVEL SECURITY;
ALTER TABLE territorial_corridor_memberships  ENABLE ROW LEVEL SECURITY;
ALTER TABLE territorial_geometries            ENABLE ROW LEVEL SECURITY;
ALTER TABLE territorial_potential_scores      ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS Policies — CRUD per table (subquery pattern, consistent
-- with migrations 05/06)
-- ============================================================

-- territorial_entities
CREATE POLICY "select_own_territorial_entities" ON territorial_entities FOR SELECT
  TO authenticated USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE));
CREATE POLICY "insert_own_territorial_entities" ON territorial_entities FOR INSERT
  TO authenticated WITH CHECK (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE));
CREATE POLICY "update_own_territorial_entities" ON territorial_entities FOR UPDATE
  TO authenticated USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE))
  WITH CHECK (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE));
CREATE POLICY "delete_own_territorial_entities" ON territorial_entities FOR DELETE
  TO authenticated USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE));

-- territorial_owners
CREATE POLICY "select_own_territorial_owners" ON territorial_owners FOR SELECT
  TO authenticated USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE));
CREATE POLICY "insert_own_territorial_owners" ON territorial_owners FOR INSERT
  TO authenticated WITH CHECK (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE));
CREATE POLICY "update_own_territorial_owners" ON territorial_owners FOR UPDATE
  TO authenticated USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE))
  WITH CHECK (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE));
CREATE POLICY "delete_own_territorial_owners" ON territorial_owners FOR DELETE
  TO authenticated USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE));

-- territorial_locations
CREATE POLICY "select_own_territorial_locations" ON territorial_locations FOR SELECT
  TO authenticated USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE));
CREATE POLICY "insert_own_territorial_locations" ON territorial_locations FOR INSERT
  TO authenticated WITH CHECK (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE));
CREATE POLICY "update_own_territorial_locations" ON territorial_locations FOR UPDATE
  TO authenticated USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE))
  WITH CHECK (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE));
CREATE POLICY "delete_own_territorial_locations" ON territorial_locations FOR DELETE
  TO authenticated USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE));

-- territorial_classifications
CREATE POLICY "select_own_territorial_classifications" ON territorial_classifications FOR SELECT
  TO authenticated USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE));
CREATE POLICY "insert_own_territorial_classifications" ON territorial_classifications FOR INSERT
  TO authenticated WITH CHECK (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE));
CREATE POLICY "update_own_territorial_classifications" ON territorial_classifications FOR UPDATE
  TO authenticated USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE))
  WITH CHECK (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE));
CREATE POLICY "delete_own_territorial_classifications" ON territorial_classifications FOR DELETE
  TO authenticated USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE));

-- territorial_operations
CREATE POLICY "select_own_territorial_operations" ON territorial_operations FOR SELECT
  TO authenticated USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE));
CREATE POLICY "insert_own_territorial_operations" ON territorial_operations FOR INSERT
  TO authenticated WITH CHECK (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE));
CREATE POLICY "update_own_territorial_operations" ON territorial_operations FOR UPDATE
  TO authenticated USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE))
  WITH CHECK (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE));
CREATE POLICY "delete_own_territorial_operations" ON territorial_operations FOR DELETE
  TO authenticated USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE));

-- territorial_assignments
CREATE POLICY "select_own_territorial_assignments" ON territorial_assignments FOR SELECT
  TO authenticated USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE));
CREATE POLICY "insert_own_territorial_assignments" ON territorial_assignments FOR INSERT
  TO authenticated WITH CHECK (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE));
CREATE POLICY "update_own_territorial_assignments" ON territorial_assignments FOR UPDATE
  TO authenticated USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE))
  WITH CHECK (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE));
CREATE POLICY "delete_own_territorial_assignments" ON territorial_assignments FOR DELETE
  TO authenticated USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE));

-- territorial_visit_history
CREATE POLICY "select_own_territorial_visit_history" ON territorial_visit_history FOR SELECT
  TO authenticated USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE));
CREATE POLICY "insert_own_territorial_visit_history" ON territorial_visit_history FOR INSERT
  TO authenticated WITH CHECK (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE));
CREATE POLICY "update_own_territorial_visit_history" ON territorial_visit_history FOR UPDATE
  TO authenticated USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE))
  WITH CHECK (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE));
CREATE POLICY "delete_own_territorial_visit_history" ON territorial_visit_history FOR DELETE
  TO authenticated USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE));

-- territorial_route_memberships
CREATE POLICY "select_own_territorial_route_memberships" ON territorial_route_memberships FOR SELECT
  TO authenticated USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE));
CREATE POLICY "insert_own_territorial_route_memberships" ON territorial_route_memberships FOR INSERT
  TO authenticated WITH CHECK (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE));
CREATE POLICY "update_own_territorial_route_memberships" ON territorial_route_memberships FOR UPDATE
  TO authenticated USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE))
  WITH CHECK (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE));
CREATE POLICY "delete_own_territorial_route_memberships" ON territorial_route_memberships FOR DELETE
  TO authenticated USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE));

-- territorial_corridor_memberships
CREATE POLICY "select_own_territorial_corridor_memberships" ON territorial_corridor_memberships FOR SELECT
  TO authenticated USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE));
CREATE POLICY "insert_own_territorial_corridor_memberships" ON territorial_corridor_memberships FOR INSERT
  TO authenticated WITH CHECK (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE));
CREATE POLICY "update_own_territorial_corridor_memberships" ON territorial_corridor_memberships FOR UPDATE
  TO authenticated USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE))
  WITH CHECK (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE));
CREATE POLICY "delete_own_territorial_corridor_memberships" ON territorial_corridor_memberships FOR DELETE
  TO authenticated USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE));

-- territorial_geometries
CREATE POLICY "select_own_territorial_geometries" ON territorial_geometries FOR SELECT
  TO authenticated USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE));
CREATE POLICY "insert_own_territorial_geometries" ON territorial_geometries FOR INSERT
  TO authenticated WITH CHECK (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE));
CREATE POLICY "update_own_territorial_geometries" ON territorial_geometries FOR UPDATE
  TO authenticated USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE))
  WITH CHECK (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE));
CREATE POLICY "delete_own_territorial_geometries" ON territorial_geometries FOR DELETE
  TO authenticated USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE));

-- territorial_potential_scores
CREATE POLICY "select_own_territorial_potential_scores" ON territorial_potential_scores FOR SELECT
  TO authenticated USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE));
CREATE POLICY "insert_own_territorial_potential_scores" ON territorial_potential_scores FOR INSERT
  TO authenticated WITH CHECK (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE));
CREATE POLICY "update_own_territorial_potential_scores" ON territorial_potential_scores FOR UPDATE
  TO authenticated USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE))
  WITH CHECK (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE));
CREATE POLICY "delete_own_territorial_potential_scores" ON territorial_potential_scores FOR DELETE
  TO authenticated USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND is_active = TRUE));
