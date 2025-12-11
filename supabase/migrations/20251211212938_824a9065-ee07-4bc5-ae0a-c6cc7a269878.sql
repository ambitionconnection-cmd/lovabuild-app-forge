-- The contact_submissions table has an issue where SELECT may be accessible to anon users
-- Let's ensure only admins can read submissions by recreating the policy with proper enforcement

-- Drop existing SELECT policy and recreate with explicit enforcement
DROP POLICY IF EXISTS "Admins can view all submissions" ON public.contact_submissions;

-- Create a proper admin-only SELECT policy
CREATE POLICY "Admins can view all submissions"
ON public.contact_submissions
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));