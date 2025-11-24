-- Fix profiles - ensure users can ONLY see their own profile
-- Drop any remaining broad policies
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- Create restrictive policy for own profile only
CREATE POLICY "Users can view only own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Fix shops contact information exposure
-- Since PostgreSQL RLS doesn't support column-level filtering easily,
-- we'll create a view without sensitive contact info for public access
-- and restrict the main table to authenticated users only

-- First, drop the existing policy
DROP POLICY IF EXISTS "Anyone can view shop locations" ON public.shops;

-- Create policy for authenticated users to see all shop data
CREATE POLICY "Authenticated users can view all shop data"
ON public.shops
FOR SELECT
TO authenticated
USING (is_active = true);

-- Create a public view without sensitive contact information
CREATE OR REPLACE VIEW public.shops_public AS
SELECT 
  id,
  name,
  slug,
  address,
  city,
  country,
  brand_id,
  category,
  latitude,
  longitude,
  official_site,
  image_url,
  description,
  is_active,
  is_unique_shop,
  created_at,
  updated_at
FROM public.shops
WHERE is_active = true;

-- Note: The view excludes email and phone fields
-- Applications should use shops_public for unauthenticated users
-- and shops table for authenticated users