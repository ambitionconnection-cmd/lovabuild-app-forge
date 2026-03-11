-- Trigger: when a brand's logo_url is updated, propagate to all linked shops
CREATE OR REPLACE FUNCTION public.sync_brand_logo_to_shops()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.logo_url IS DISTINCT FROM OLD.logo_url AND NEW.logo_url IS NOT NULL THEN
    UPDATE shops
    SET logo_url = NEW.logo_url
    WHERE brand_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_brand_logo
AFTER UPDATE OF logo_url ON brands
FOR EACH ROW
EXECUTE FUNCTION public.sync_brand_logo_to_shops();

-- Trigger: when a shop is linked to a brand (insert or brand_id change), copy brand logo
CREATE OR REPLACE FUNCTION public.sync_shop_logo_from_brand()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.brand_id IS NOT NULL AND NEW.logo_url IS NULL THEN
    SELECT logo_url INTO NEW.logo_url
    FROM brands
    WHERE id = NEW.brand_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_shop_logo_on_insert
BEFORE INSERT ON shops
FOR EACH ROW
EXECUTE FUNCTION public.sync_shop_logo_from_brand();

CREATE TRIGGER trg_sync_shop_logo_on_update
BEFORE UPDATE OF brand_id ON shops
FOR EACH ROW
EXECUTE FUNCTION public.sync_shop_logo_from_brand();