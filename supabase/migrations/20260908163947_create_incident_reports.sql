/*
# Create incident reports for SafeHer

1. New Tables
- `incident_reports` stores community-submitted safety reports.
- `id` (uuid, primary key)
- `category` (text, incident category)
- `description` (text, report details)
- `location` (text, human-readable location)
- `status` (text, moderation state)
- `created_at` (timestamptz, submission time)

2. Security
- Row level security is enabled.
- This is a single-tenant prototype without sign-in, so anonymous and authenticated users can create reports and view the shared moderation queue.
- Updates and deletes are available to the shared admin dashboard prototype.

3. Important Notes
- Status is constrained to pending, verified, or rejected.
- Reports are intentionally shared so the safety map and admin review queue can use the same source of truth.
*/

CREATE TABLE IF NOT EXISTS public.incident_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  description text NOT NULL,
  location text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.incident_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "shared_select_incident_reports" ON public.incident_reports;
CREATE POLICY "shared_select_incident_reports" ON public.incident_reports
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "shared_insert_incident_reports" ON public.incident_reports;
CREATE POLICY "shared_insert_incident_reports" ON public.incident_reports
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "shared_update_incident_reports" ON public.incident_reports;
CREATE POLICY "shared_update_incident_reports" ON public.incident_reports
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "shared_delete_incident_reports" ON public.incident_reports;
CREATE POLICY "shared_delete_incident_reports" ON public.incident_reports
  FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS incident_reports_status_idx ON public.incident_reports (status);
CREATE INDEX IF NOT EXISTS incident_reports_created_at_idx ON public.incident_reports (created_at DESC);