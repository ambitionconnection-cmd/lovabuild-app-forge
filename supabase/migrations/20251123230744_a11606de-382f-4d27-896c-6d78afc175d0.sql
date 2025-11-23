-- Create storage bucket for drop images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'drop-images',
  'drop-images',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
);

-- Allow public read access to drop images
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'drop-images');

-- Allow authenticated users to upload images (for admin)
CREATE POLICY "Authenticated users can upload drop images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'drop-images');

-- Allow authenticated users to update images (for admin)
CREATE POLICY "Authenticated users can update drop images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'drop-images');

-- Allow authenticated users to delete images (for admin)
CREATE POLICY "Authenticated users can delete drop images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'drop-images');