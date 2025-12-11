-- Drop the overly permissive policy - we should NOT expose the full shops table
DROP POLICY IF EXISTS "Anyone can view active shops via public view" ON public.shops;

-- The shops_public VIEW already excludes email and phone columns
-- We need to use a security definer function instead to allow view access

-- Create a security definer function to safely access active shop data
CREATE OR REPLACE FUNCTION public.get_active_shops_for_view()
RETURNS SETOF public.shops
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.shops WHERE is_active = true
$$;

-- Grant execute on the function to allow view access
GRANT EXECUTE ON FUNCTION public.get_active_shops_for_view() TO anon, authenticated;