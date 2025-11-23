-- Create storage bucket for brand images
INSERT INTO storage.buckets (id, name, public)
VALUES ('brand-images', 'brand-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for brand-images bucket
CREATE POLICY "Brand images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'brand-images');

CREATE POLICY "Authenticated users can upload brand images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'brand-images' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can update brand images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'brand-images' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete brand images"
ON storage.objects FOR DELETE
USING (bucket_id = 'brand-images' AND auth.role() = 'authenticated');