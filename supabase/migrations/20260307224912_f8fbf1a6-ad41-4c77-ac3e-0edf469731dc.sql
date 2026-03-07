CREATE OR REPLACE FUNCTION public.get_user_email_if_public(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT CASE 
    WHEN p.show_email = true THEN u.email::text
    ELSE NULL
  END
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE p.id = _user_id
$$;