-- Backfill: copy brand logo_url to shops that are missing it
UPDATE shops s
SET logo_url = b.logo_url
FROM brands b
WHERE s.brand_id = b.id
  AND s.logo_url IS NULL
  AND b.logo_url IS NOT NULL;