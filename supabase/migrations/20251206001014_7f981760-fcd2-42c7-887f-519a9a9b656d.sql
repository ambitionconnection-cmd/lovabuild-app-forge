-- Create a security definer function to safely get the current user's email
CREATE OR REPLACE FUNCTION public.get_current_user_email()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email::text FROM auth.users WHERE id = auth.uid()
$$;

-- Drop the old vulnerable policy
DROP POLICY IF EXISTS "Users can view own login attempts" ON public.login_attempts;

-- Create a new secure policy using the security definer function
CREATE POLICY "Users can view own login attempts"
ON public.login_attempts
FOR SELECT
TO authenticated
USING (email = public.get_current_user_email());