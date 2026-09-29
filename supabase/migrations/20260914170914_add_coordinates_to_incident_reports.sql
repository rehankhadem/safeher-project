/*
# Add coordinates to incident reports

1. Modified Tables
- `incident_reports`
  - `lat` (double precision, nullable) — latitude for map marker placement
  - `lng` (double precision, nullable) — longitude for map marker placement

2. Security
- No security changes. Existing RLS policies remain in effect.

3. Important Notes
- Both columns are nullable so existing reports without coordinates are not affected.
- New reports submitted from the map will include coordinates.
*/

ALTER TABLE public.incident_reports
  ADD COLUMN IF NOT EXISTS lat double precision,
  ADD COLUMN IF NOT EXISTS lng double precision;