
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;

-- Backfill existing profiles with email from auth.users
UPDATE public.profiles
SET email = u.email
FROM auth.users u
WHERE profiles.user_id = u.id AND profiles.email IS NULL;

-- Update trigger to also store email
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email), NEW.email);
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$function$;
