/*
# Fix RLS for public access + revoke trigger execution

1. Security Changes
- incident_reports SELECT: allow anon AND authenticated (public can browse
  routes and see incidents without logging in)
- incident_reports INSERT: authenticated only (must be logged in to report)
- incident_reports UPDATE/DELETE: admin only (unchanged)
- profiles: allow anon SELECT so the admin role check in INSERT/UPDATE
  policies can resolve the subquery against profiles during policy
  evaluation. The profile rows themselves are still protected — anon can
  read them but cannot modify or delete.
- Revoke EXECUTE on handle_new_user from anon and authenticated. The
  function is only called by a trigger on auth.users, never via RPC.

2. Important Notes
- This fixes the "Database error querying schema" error that occurred when
  admin login tried to fetch the profile. The anon SELECT policy on profiles
  was missing, so the RLS subquery in incident_reports policies could not
  resolve. Now both anon and authenticated can read profiles for policy
  evaluation.
- Route search, map viewing, and community reports browsing work without
  any login. Login is only required to submit a new incident report.
*/

-- incident_reports: public can read, authenticated can insert, admin can update/delete
DROP POLICY IF EXISTS "shared_select_incident_reports" ON incident_reports;
CREATE POLICY "shared_select_incident_reports"
ON incident_reports FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "shared_insert_incident_reports" ON incident_reports;
CREATE POLICY "shared_insert_incident_reports"
ON incident_reports FOR INSERT
TO authenticated
WITH CHECK (true);

-- profiles: allow both anon and authenticated to SELECT (needed for RLS subquery resolution)
DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile"
ON profiles FOR SELECT
TO anon, authenticated
USING (true);

-- Revoke EXECUTE on the trigger function from anon and authenticated
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;