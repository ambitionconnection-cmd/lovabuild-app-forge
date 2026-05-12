
WITH new_brands AS (
  INSERT INTO public.brands (name, slug, country, is_active, is_west_indies, brand_tier, official_website, description)
  VALUES
    ('CUB Streetwear', 'cub-streetwear', 'Guadeloupe', true, true, 'emerging', 'https://www.cubstreetwear.fr', 'Guadeloupean streetwear brand founded in 2013. Ready-to-wear for men, women and kids with a strong local identity.'),
    ('The Factory 971', 'the-factory-971', 'Guadeloupe', true, true, 'emerging', 'https://www.thefactorygwadloup.com', 'Pointe-à-Pitre concept store celebrating Guadeloupean designers, artisans and producers — fashion meets fine grocery.'),
    ('JOKO', 'joko-guadeloupe', 'Guadeloupe', true, true, 'emerging', NULL, 'Long-running Pointe-à-Pitre menswear shop on Rue Frébault.')
  ON CONFLICT (slug) DO UPDATE SET is_west_indies = EXCLUDED.is_west_indies, brand_tier = EXCLUDED.brand_tier
  RETURNING id, slug
)
INSERT INTO public.shops (brand_id, name, slug, address, city, country, latitude, longitude, is_west_indies, is_unique_shop, category, is_active, official_site)
SELECT
  nb.id,
  CASE nb.slug WHEN 'cub-streetwear' THEN 'CUB Streetwear' WHEN 'the-factory-971' THEN 'The Factory 971' ELSE 'JOKO' END,
  CASE nb.slug WHEN 'cub-streetwear' THEN 'cub-streetwear-pap' WHEN 'the-factory-971' THEN 'the-factory-971-pap' ELSE 'joko-pap' END,
  CASE nb.slug WHEN 'cub-streetwear' THEN '19 Rue Hincelin, Porte 22' WHEN 'the-factory-971' THEN 'Rue Achille René Boisneuf' ELSE '116 Rue Frébault' END,
  'Guadeloupe', 'Guadeloupe',
  CASE nb.slug WHEN 'cub-streetwear' THEN 16.24390930 WHEN 'the-factory-971' THEN 16.23721700 ELSE 16.24062260 END,
  CASE nb.slug WHEN 'cub-streetwear' THEN -61.53374430 WHEN 'the-factory-971' THEN -61.53819900 ELSE -61.53542170 END,
  true, true, 'streetwear'::category_type, true,
  CASE nb.slug WHEN 'cub-streetwear' THEN 'https://www.cubstreetwear.fr' WHEN 'the-factory-971' THEN 'https://www.thefactorygwadloup.com' ELSE NULL END
FROM new_brands nb
ON CONFLICT (slug) DO NOTHING;
