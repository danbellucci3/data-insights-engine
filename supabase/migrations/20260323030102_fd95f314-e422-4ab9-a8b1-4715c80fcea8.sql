
-- Create a security definer function to check if user has shared access
CREATE OR REPLACE FUNCTION public.has_data_access(data_owner_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.data_sharing
    WHERE owner_id = data_owner_id
      AND shared_with_id = auth.uid()
  )
$$;

-- Create function to check upload permission
CREATE OR REPLACE FUNCTION public.has_upload_access(data_owner_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.data_sharing
    WHERE owner_id = data_owner_id
      AND shared_with_id = auth.uid()
      AND permission = 'view_upload'
  )
$$;

-- Update RLS for all 7 data tables to allow shared access
-- investimentos
DROP POLICY IF EXISTS "Users manage own investimentos" ON public.investimentos;
CREATE POLICY "Owner full access investimentos" ON public.investimentos FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Shared view investimentos" ON public.investimentos FOR SELECT TO authenticated
  USING (public.has_data_access(user_id));
CREATE POLICY "Shared upload investimentos" ON public.investimentos FOR INSERT TO authenticated
  WITH CHECK (public.has_upload_access(user_id));

-- dre
DROP POLICY IF EXISTS "Users manage own dre" ON public.dre;
CREATE POLICY "Owner full access dre" ON public.dre FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Shared view dre" ON public.dre FOR SELECT TO authenticated
  USING (public.has_data_access(user_id));
CREATE POLICY "Shared upload dre" ON public.dre FOR INSERT TO authenticated
  WITH CHECK (public.has_upload_access(user_id));

-- balanco
DROP POLICY IF EXISTS "Users manage own balanco" ON public.balanco;
CREATE POLICY "Owner full access balanco" ON public.balanco FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Shared view balanco" ON public.balanco FOR SELECT TO authenticated
  USING (public.has_data_access(user_id));
CREATE POLICY "Shared upload balanco" ON public.balanco FOR INSERT TO authenticated
  WITH CHECK (public.has_upload_access(user_id));

-- fluxo_de_caixa
DROP POLICY IF EXISTS "Users manage own fluxo_de_caixa" ON public.fluxo_de_caixa;
CREATE POLICY "Owner full access fluxo_de_caixa" ON public.fluxo_de_caixa FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Shared view fluxo_de_caixa" ON public.fluxo_de_caixa FOR SELECT TO authenticated
  USING (public.has_data_access(user_id));
CREATE POLICY "Shared upload fluxo_de_caixa" ON public.fluxo_de_caixa FOR INSERT TO authenticated
  WITH CHECK (public.has_upload_access(user_id));

-- folha_de_pagamento
DROP POLICY IF EXISTS "Users manage own folha" ON public.folha_de_pagamento;
CREATE POLICY "Owner full access folha" ON public.folha_de_pagamento FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Shared view folha" ON public.folha_de_pagamento FOR SELECT TO authenticated
  USING (public.has_data_access(user_id));
CREATE POLICY "Shared upload folha" ON public.folha_de_pagamento FOR INSERT TO authenticated
  WITH CHECK (public.has_upload_access(user_id));

-- projetos
DROP POLICY IF EXISTS "Users manage own projetos" ON public.projetos;
CREATE POLICY "Owner full access projetos" ON public.projetos FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Shared view projetos" ON public.projetos FOR SELECT TO authenticated
  USING (public.has_data_access(user_id));
CREATE POLICY "Shared upload projetos" ON public.projetos FOR INSERT TO authenticated
  WITH CHECK (public.has_upload_access(user_id));

-- fornecedores
DROP POLICY IF EXISTS "Users manage own fornecedores" ON public.fornecedores;
CREATE POLICY "Owner full access fornecedores" ON public.fornecedores FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Shared view fornecedores" ON public.fornecedores FOR SELECT TO authenticated
  USING (public.has_data_access(user_id));
CREATE POLICY "Shared upload fornecedores" ON public.fornecedores FOR INSERT TO authenticated
  WITH CHECK (public.has_upload_access(user_id));

-- Function to auto-accept pending invites when a user signs up
CREATE OR REPLACE FUNCTION public.accept_pending_invites()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.data_sharing (owner_id, shared_with_id, permission)
  SELECT di.owner_id, NEW.id, di.permission
  FROM public.data_invites di
  WHERE di.email = NEW.email AND di.status = 'pending'
  ON CONFLICT (owner_id, shared_with_id) DO NOTHING;

  UPDATE public.data_invites
  SET status = 'accepted'
  WHERE email = NEW.email AND status = 'pending';

  RETURN NEW;
END;
$$;

-- NOTE: Cannot create trigger on auth.users (reserved schema)
-- We'll handle invite acceptance in app code instead
DROP FUNCTION IF EXISTS public.accept_pending_invites() CASCADE;
