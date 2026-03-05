
-- Create brand_tier enum
CREATE TYPE public.brand_tier AS ENUM ('established', 'emerging');

-- Add brand_tier column to brands table, defaulting existing brands to 'established'
ALTER TABLE public.brands ADD COLUMN brand_tier public.brand_tier NOT NULL DEFAULT 'established';
