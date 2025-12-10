-- Drop existing policies on contact_submissions to recreate them properly
DROP POLICY IF EXISTS "Anyone can submit contact forms" ON public.contact_submissions;
DROP POLICY IF EXISTS "Admins can view all submissions" ON public.contact_submissions;
DROP POLICY IF EXISTS "Admins can update submissions" ON public.contact_submissions;

-- Recreate INSERT policy as PERMISSIVE (allows anyone to submit contact forms)
CREATE POLICY "Anyone can submit contact forms" 
ON public.contact_submissions 
FOR INSERT 
TO public
WITH CHECK (true);

-- Recreate SELECT policy as PERMISSIVE (only admins can view)
CREATE POLICY "Admins can view all submissions" 
ON public.contact_submissions 
FOR SELECT 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Recreate UPDATE policy as PERMISSIVE (only admins can update)
CREATE POLICY "Admins can update submissions" 
ON public.contact_submissions 
FOR UPDATE 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Ensure DELETE is explicitly denied (no policy = no access)
-- No DELETE policy needed - RLS will deny by default