
-- Create security definer function to get current user email
CREATE OR REPLACE FUNCTION public.get_user_email()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT email::text FROM auth.users WHERE id = auth.uid()
$$;

-- Drop the problematic policy
DROP POLICY IF EXISTS "Invited users view their invites" ON public.data_invites;

-- Recreate with security definer function
CREATE POLICY "Invited users view their invites"
ON public.data_invites
FOR SELECT
TO authenticated
USING (email = public.get_user_email());
