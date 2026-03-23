
-- Table for sharing access: owner shares their data with other users
CREATE TABLE public.data_sharing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  shared_with_id uuid NOT NULL,
  permission text NOT NULL DEFAULT 'view' CHECK (permission IN ('view', 'view_upload')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_id, shared_with_id)
);

-- Table for pending invites (by email)
CREATE TABLE public.data_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  email text NOT NULL,
  permission text NOT NULL DEFAULT 'view' CHECK (permission IN ('view', 'view_upload')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_id, email)
);

-- RLS on data_sharing
ALTER TABLE public.data_sharing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage their shares"
  ON public.data_sharing FOR ALL
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Shared users view their access"
  ON public.data_sharing FOR SELECT
  TO authenticated
  USING (auth.uid() = shared_with_id);

-- RLS on data_invites
ALTER TABLE public.data_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage their invites"
  ON public.data_invites FOR ALL
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Invited users view their invites"
  ON public.data_invites FOR SELECT
  TO authenticated
  USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));
