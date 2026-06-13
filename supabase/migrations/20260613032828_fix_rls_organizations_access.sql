-- Allow anonymous access to organizations for login flow
DROP POLICY IF EXISTS "organizations_select" ON organizations;
CREATE POLICY "organizations_select" ON organizations 
  FOR SELECT TO anon, authenticated USING (true);

-- Update access_events to allow anonymous insert
DROP POLICY IF EXISTS "access_events_insert" ON access_events;
CREATE POLICY "access_events_insert" ON access_events 
  FOR INSERT TO anon, authenticated WITH CHECK (true);