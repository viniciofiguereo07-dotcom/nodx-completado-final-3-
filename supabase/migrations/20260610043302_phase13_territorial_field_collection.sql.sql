-- Phase 13: Territorial Field Collection Engine

-- Territorial Forms: Dynamic form definitions
CREATE TABLE IF NOT EXISTS territorial_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  schema JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_territorial_forms_org ON territorial_forms(organization_id);
CREATE INDEX IF NOT EXISTS idx_territorial_forms_active ON territorial_forms(is_active);

-- Territorial Submissions: Field collection submissions
CREATE TABLE IF NOT EXISTS territorial_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  form_id UUID NOT NULL REFERENCES territorial_forms(id) ON DELETE CASCADE,
  entity_id UUID,
  entity_type VARCHAR(100),
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
  data JSONB NOT NULL DEFAULT '{}',
  gps_latitude DOUBLE PRECISION,
  gps_longitude DOUBLE PRECISION,
  gps_accuracy DOUBLE PRECISION,
  submitted_at TIMESTAMPTZ,
  submitted_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_territorial_submissions_org ON territorial_submissions(organization_id);
CREATE INDEX IF NOT EXISTS idx_territorial_submissions_form ON territorial_submissions(form_id);
CREATE INDEX IF NOT EXISTS idx_territorial_submissions_status ON territorial_submissions(status);
CREATE INDEX IF NOT EXISTS idx_territorial_submissions_entity ON territorial_submissions(entity_id);

-- Territorial Photos: Photo evidence linked to submissions
CREATE TABLE IF NOT EXISTS territorial_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  submission_id UUID NOT NULL REFERENCES territorial_submissions(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name VARCHAR(255),
  file_size INTEGER,
  mime_type VARCHAR(100),
  gps_latitude DOUBLE PRECISION,
  gps_longitude DOUBLE PRECISION,
  gps_accuracy DOUBLE PRECISION,
  caption TEXT,
  metadata JSONB DEFAULT '{}',
  taken_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_territorial_photos_org ON territorial_photos(organization_id);
CREATE INDEX IF NOT EXISTS idx_territorial_photos_submission ON territorial_photos(submission_id);

-- Territorial Signatures: Digital signatures for submissions
CREATE TABLE IF NOT EXISTS territorial_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  submission_id UUID NOT NULL REFERENCES territorial_submissions(id) ON DELETE CASCADE,
  signer_name VARCHAR(255) NOT NULL,
  signer_role VARCHAR(100),
  signature_data TEXT NOT NULL,
  document_type VARCHAR(100),
  signed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ip_address VARCHAR(50)
);

CREATE INDEX IF NOT EXISTS idx_territorial_signatures_org ON territorial_signatures(organization_id);
CREATE INDEX IF NOT EXISTS idx_territorial_signatures_submission ON territorial_signatures(submission_id);

-- Enable RLS
ALTER TABLE territorial_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE territorial_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE territorial_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE territorial_signatures ENABLE ROW LEVEL SECURITY;

-- RLS Policies using is_org_member pattern
DO $$
DECLARE t TEXT;
tables TEXT[] := ARRAY['territorial_forms', 'territorial_submissions', 'territorial_photos', 'territorial_signatures'];
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