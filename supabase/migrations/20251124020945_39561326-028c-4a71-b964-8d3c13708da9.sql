-- Fix profiles table - ensure only authenticated users can view their own profile
-- The existing policies already restrict correctly, but we need to verify no public access exists

-- Fix login attempts exposure - restrict to user's own attempts only
DROP POLICY IF EXISTS "Users can view their own login attempts" ON public.login_attempts;

-- Create proper policy for users to view only their own login attempts
CREATE POLICY "Users can view own login attempts"
ON public.login_attempts
FOR SELECT
TO authenticated
USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));