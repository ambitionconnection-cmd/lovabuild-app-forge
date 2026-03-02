
-- Street Spotted tables
CREATE TABLE public.street_spotted_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  image_url TEXT NOT NULL,
  caption TEXT,
  city TEXT,
  country TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.street_spotted_post_brands (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.street_spotted_posts(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE
);

CREATE TABLE public.street_spotted_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.street_spotted_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- Brand Radar table
CREATE TABLE public.brand_radar_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  summary TEXT,
  source_url TEXT NOT NULL,
  thumbnail_url TEXT,
  source_name TEXT,
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(source_url)
);

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('street-spotted', 'street-spotted', true);

-- RLS: street_spotted_posts
ALTER TABLE public.street_spotted_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view posts" ON public.street_spotted_posts
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert own posts" ON public.street_spotted_posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own posts" ON public.street_spotted_posts
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Admins can delete any post" ON public.street_spotted_posts
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS: street_spotted_post_brands
ALTER TABLE public.street_spotted_post_brands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view post brands" ON public.street_spotted_post_brands
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert post brands" ON public.street_spotted_post_brands
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.street_spotted_posts WHERE id = post_id AND user_id = auth.uid())
  );

-- RLS: street_spotted_likes
ALTER TABLE public.street_spotted_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view likes" ON public.street_spotted_likes
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can like" ON public.street_spotted_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike" ON public.street_spotted_likes
  FOR DELETE USING (auth.uid() = user_id);

-- RLS: brand_radar_items
ALTER TABLE public.brand_radar_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view radar items" ON public.brand_radar_items
  FOR SELECT USING (true);

CREATE POLICY "Service role can insert radar items" ON public.brand_radar_items
  FOR INSERT WITH CHECK (true);

-- Storage RLS for street-spotted bucket
CREATE POLICY "Anyone can view street spotted images" ON storage.objects
  FOR SELECT USING (bucket_id = 'street-spotted');

CREATE POLICY "Authenticated users can upload street spotted images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'street-spotted' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete own street spotted images" ON storage.objects
  FOR DELETE USING (bucket_id = 'street-spotted' AND auth.uid()::text = (storage.foldername(name))[1]);
