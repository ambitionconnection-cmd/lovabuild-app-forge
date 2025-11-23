-- Add country column to brands table
ALTER TABLE public.brands ADD COLUMN country TEXT;

-- Create index for better performance on country filtering
CREATE INDEX idx_brands_country ON public.brands(country);

-- Add comment
COMMENT ON COLUMN public.brands.country IS 'Country where the brand is based or primarily operates';