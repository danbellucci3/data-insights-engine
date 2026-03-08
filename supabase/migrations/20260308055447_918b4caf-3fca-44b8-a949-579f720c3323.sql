
-- Access profiles table
CREATE TABLE public.access_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Which tables each profile can access
CREATE TABLE public.access_profile_tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.access_profiles(id) ON DELETE CASCADE,
  table_name text NOT NULL,
  access_level text NOT NULL DEFAULT 'full',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(profile_id, table_name)
);

-- Assign users to profiles
CREATE TABLE public.user_access_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  profile_id uuid NOT NULL REFERENCES public.access_profiles(id) ON DELETE CASCADE,
  assigned_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, profile_id)
);

-- RLS
ALTER TABLE public.access_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_profile_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_access_profiles ENABLE ROW LEVEL SECURITY;

-- Admins can manage access profiles
CREATE POLICY "Admins manage access_profiles" ON public.access_profiles
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage access_profile_tables" ON public.access_profile_tables
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage user_access_profiles" ON public.user_access_profiles
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Users can read their own access profile assignments
CREATE POLICY "Users view own access" ON public.user_access_profiles
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Users can view profile details for their assigned profiles
CREATE POLICY "Users view assigned profiles" ON public.access_profiles
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_access_profiles
    WHERE user_access_profiles.profile_id = access_profiles.id
    AND user_access_profiles.user_id = auth.uid()
  )
);

CREATE POLICY "Users view assigned profile tables" ON public.access_profile_tables
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_access_profiles
    WHERE user_access_profiles.profile_id = access_profile_tables.profile_id
    AND user_access_profiles.user_id = auth.uid()
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_access_profiles_updated_at
  BEFORE UPDATE ON public.access_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
