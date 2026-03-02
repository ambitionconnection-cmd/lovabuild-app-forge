
-- Featured brands table for "Brand of the Week"
CREATE TABLE public.featured_brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date NOT NULL DEFAULT (CURRENT_DATE + interval '7 days'),
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.featured_brands ENABLE ROW LEVEL SECURITY;

-- Anyone can view active featured brands
CREATE POLICY "Anyone can view active featured brands"
  ON public.featured_brands FOR SELECT
  USING (is_active = true);

-- Admins can manage featured brands
CREATE POLICY "Admins can manage featured brands"
  ON public.featured_brands FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
