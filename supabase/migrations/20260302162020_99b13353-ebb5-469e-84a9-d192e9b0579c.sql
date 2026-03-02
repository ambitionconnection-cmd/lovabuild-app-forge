
-- Curated collections table
CREATE TABLE public.collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  brand_ids uuid[] NOT NULL DEFAULT '{}',
  cover_image_url text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_collections_slug ON public.collections(slug);

ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;

-- Anyone can view active collections
CREATE POLICY "Anyone can view active collections"
  ON public.collections FOR SELECT
  USING (is_active = true);

-- Admins can manage collections
CREATE POLICY "Admins can manage collections"
  ON public.collections FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
