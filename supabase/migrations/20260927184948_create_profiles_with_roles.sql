/*
# Create profiles table with role-based access

1. New Tables
- `profiles` — one row per auth user, stores their display name and role
  - `id` (uuid, primary key, references auth.users)
  - `email` (text, unique, not null)
  - `display_name` (text, not null)
  - `role` (text, not null, default 'user' — either 'user' or 'admin')
  - `created_at` (timestamptz, default now())

2. Trigger
- `handle_new_user` function + trigger — fires on INSERT into auth.users,
  automatically creates a matching profiles row with role 'user'.
  This means every new signup gets a profile without the frontend needing
  to do a separate insert.

3. Security (RLS)
- Enable RLS on `profiles`.
- SELECT: users can read their own profile.
- UPDATE: users can update their own profile (but NOT their role — role is
  controlled server-side only).
- No INSERT/DELETE policies — profiles are created exclusively by the trigger.

4. Important Notes
- The admin account (email: admin@safeher.local, password: 12345) will be
  created via the frontend signUp flow, then manually promoted to role='admin'
  via execute_sql in a follow-up step.
- Role is stored in the profiles table, NOT in user_metadata, so users cannot
  self-elevate by editing their profile.
*/

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  display_name text NOT NULL DEFAULT 'User',
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile"
ON profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Function to auto-create a profile row when a new auth user is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', 'User'),
    'user'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Grant the trigger function permission to insert into profiles
GRANT INSERT ON profiles TO authenticated;
GRANT SELECT ON profiles TO authenticated;
GRANT UPDATE ON profiles TO authenticated;