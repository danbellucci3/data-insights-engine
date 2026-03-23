-- Accept pending data invites for the currently authenticated user
CREATE OR REPLACE FUNCTION public.accept_pending_data_invites()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_email text;
  v_accepted_count integer := 0;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN 0;
  END IF;

  v_email := lower(public.get_user_email());
  IF v_email IS NULL OR v_email = '' THEN
    RETURN 0;
  END IF;

  INSERT INTO public.data_sharing (owner_id, shared_with_id, permission)
  SELECT di.owner_id, v_user_id, di.permission
  FROM public.data_invites di
  WHERE lower(di.email) = v_email
    AND di.status = 'pending'
  ON CONFLICT (owner_id, shared_with_id)
  DO UPDATE SET permission = EXCLUDED.permission;

  UPDATE public.data_invites di
  SET status = 'accepted'
  WHERE lower(di.email) = v_email
    AND di.status = 'pending';

  GET DIAGNOSTICS v_accepted_count = ROW_COUNT;
  RETURN v_accepted_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_pending_data_invites() TO authenticated;