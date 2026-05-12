ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS is_west_indies boolean NOT NULL DEFAULT false;
ALTER TABLE public.brands ADD COLUMN IF NOT EXISTS is_west_indies boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_shops_west_indies ON public.shops(is_west_indies) WHERE is_west_indies = true;
CREATE INDEX IF NOT EXISTS idx_brands_west_indies ON public.brands(is_west_indies) WHERE is_west_indies = true;