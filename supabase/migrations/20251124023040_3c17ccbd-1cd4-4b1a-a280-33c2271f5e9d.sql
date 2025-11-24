-- Create public view for shops without sensitive contact information
CREATE VIEW public.shops_public AS
SELECT 
  id,
  name,
  slug,
  address,
  city,
  country,
  latitude,
  longitude,
  official_site,
  image_url,
  description,
  category,
  brand_id,
  is_active,
  is_unique_shop,
  created_at,
  updated_at
FROM public.shops
WHERE is_active = true;

-- Drop the existing public policy on shops table
DROP POLICY IF EXISTS "Anyone can view active shops" ON public.shops;

-- Create new RLS policy: only authenticated users can view full shops data
CREATE POLICY "Authenticated users can view shops"
ON public.shops
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Grant SELECT on the public view to anonymous users
GRANT SELECT ON public.shops_public TO anon;
GRANT SELECT ON public.shops_public TO authenticated;