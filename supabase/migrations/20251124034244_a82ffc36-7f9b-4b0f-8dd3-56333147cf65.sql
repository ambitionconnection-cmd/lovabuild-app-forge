-- Drop and recreate shops_public view to include opening_hours
DROP VIEW IF EXISTS public.shops_public;

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
  category,
  official_site,
  image_url,
  description,
  brand_id,
  is_active,
  is_unique_shop,
  opening_hours,
  created_at,
  updated_at
FROM public.shops
WHERE is_active = true;