-- Allow anonymous select on organization_members for login validation
DROP POLICY IF EXISTS "org_members_select" ON organization_members;
CREATE POLICY "org_members_select" ON organization_members 
  FOR SELECT TO anon, authenticated USING (true);