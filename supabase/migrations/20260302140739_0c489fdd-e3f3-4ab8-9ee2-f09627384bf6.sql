CREATE OR REPLACE FUNCTION public.get_popular_brands_for_radar(brand_limit integer DEFAULT 30)
RETURNS TABLE(id uuid, name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT b.id, b.name
  FROM brands b
  JOIN user_favorite_brands uf ON uf.brand_id = b.id
  WHERE b.is_active = true
  GROUP BY b.id, b.name
  ORDER BY COUNT(uf.id) DESC
  LIMIT brand_limit;
$$;