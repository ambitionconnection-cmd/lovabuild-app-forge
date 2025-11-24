-- Revert the restrictive shops policy and allow public read access
-- but the application code will be updated to not display sensitive fields to unauthenticated users
DROP POLICY IF EXISTS "Authenticated users can view all shop data" ON public.shops;

-- Allow public read access to shops (application will control what's displayed)
CREATE POLICY "Anyone can view active shops"
ON public.shops
FOR SELECT
USING (is_active = true);

-- Drop the view as we'll handle this at the application level
DROP VIEW IF EXISTS public.shops_public;