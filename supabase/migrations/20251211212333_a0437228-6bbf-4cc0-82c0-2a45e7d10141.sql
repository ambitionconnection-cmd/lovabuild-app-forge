-- Drop the overly permissive policy that exposes contact info
DROP POLICY IF EXISTS "Authenticated users can view shops" ON public.shops;

-- Add admin-only SELECT policy for the full shops table (with email/phone)
CREATE POLICY "Admins can view all shops"
ON public.shops
FOR SELECT
USING (has_role(auth.uid(), 'admin'));