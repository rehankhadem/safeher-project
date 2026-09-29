/*
# Update incident_reports RLS policies for role-based access

1. Security Changes
- SELECT: all authenticated users can view reports (needed for the map)
- INSERT: all authenticated users can submit reports
- UPDATE: restricted to admin role only (for verify/reject actions)
- DELETE: restricted to admin role only

2. Important Notes
- Regular users can read all reports and submit new ones.
- Only users with role='admin' in the profiles table can change report
  status or delete reports.
- The admin check uses a subquery against the profiles table, so the role
  cannot be spoofed via client-side code.
*/

DROP POLICY IF EXISTS "shared_select_incident_reports" ON incident_reports;
CREATE POLICY "shared_select_incident_reports"
ON incident_reports FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "shared_insert_incident_reports" ON incident_reports;
CREATE POLICY "shared_insert_incident_reports"
ON incident_reports FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "shared_update_incident_reports" ON incident_reports;
CREATE POLICY "shared_update_incident_reports"
ON incident_reports FOR UPDATE
TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

DROP POLICY IF EXISTS "shared_delete_incident_reports" ON incident_reports;
CREATE POLICY "shared_delete_incident_reports"
ON incident_reports FOR DELETE
TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));