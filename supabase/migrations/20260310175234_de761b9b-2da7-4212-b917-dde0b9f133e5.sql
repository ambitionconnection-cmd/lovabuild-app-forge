DROP VIEW IF EXISTS public.shops_public;
CREATE VIEW public.shops_public AS
SELECT id, name, slug, address, city, country, latitude, longitude, category, official_site, image_url, logo_url, description, brand_id, is_active, is_unique_shop, opening_hours, instagram_url, created_at, updated_at
FROM shops
WHERE is_active = true;