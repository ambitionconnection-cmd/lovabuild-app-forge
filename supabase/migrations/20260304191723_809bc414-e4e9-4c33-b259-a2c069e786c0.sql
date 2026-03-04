
CREATE TABLE public.brand_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requested_by uuid NOT NULL,
  brand_name text NOT NULL,
  post_id uuid REFERENCES public.street_spotted_posts(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending',
  admin_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

ALTER TABLE public.brand_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can request brands"
  ON public.brand_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = requested_by);

CREATE POLICY "Users can view own requests"
  ON public.brand_requests FOR SELECT TO authenticated
  USING (auth.uid() = requested_by);

CREATE POLICY "Admins can manage brand requests"
  ON public.brand_requests FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
