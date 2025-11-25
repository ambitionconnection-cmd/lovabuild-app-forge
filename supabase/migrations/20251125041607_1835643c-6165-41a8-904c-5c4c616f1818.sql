-- Add TikTok URL column to brands table
ALTER TABLE brands 
ADD COLUMN IF NOT EXISTS tiktok_url TEXT;

COMMENT ON COLUMN brands.tiktok_url IS 'Official TikTok profile URL for the brand';