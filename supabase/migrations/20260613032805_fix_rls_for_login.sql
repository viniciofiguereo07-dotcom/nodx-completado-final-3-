-- Fix RLS policies for bootstrap and login flow

-- 1. Add policy for platform_bootstrap to allow anonymous read access
-- This is needed for the login page to check bootstrap status
CREATE POLICY "platform_bootstrap_select" ON platform_bootstrap 
  FOR SELECT TO anon, authenticated USING (true);

-- 2. Update profiles policy to allow anonymous read access for user_code lookup
-- This is needed for signInWithCode to work before authentication
DROP POLICY IF EXISTS "profiles_select" ON profiles;
CREATE POLICY "profiles_select" ON profiles 
  FOR SELECT TO anon, authenticated USING (true);

-- 3. Keep insert/update policies for authenticated users only
-- (These already exist, but let's make sure they're correct)

-- Enable appropriate access for login flow
GRANT SELECT ON platform_bootstrap TO anon, authenticated;
GRANT SELECT ON profiles TO anon, authenticated;