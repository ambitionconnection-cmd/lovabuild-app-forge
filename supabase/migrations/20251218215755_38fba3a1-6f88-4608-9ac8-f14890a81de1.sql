-- Drop the unused get_active_shops_for_view function
-- This function bypasses RLS with SECURITY DEFINER and is not used in the application
DROP FUNCTION IF EXISTS public.get_active_shops_for_view();