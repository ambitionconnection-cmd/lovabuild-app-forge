CREATE TABLE public.shop_this_fit_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES public.street_spotted_posts(id) ON DELETE CASCADE NOT NULL,
  platform text NOT NULL,
  item_brand text NOT NULL,
  item_model text NOT NULL,
  item_category text NOT NULL,
  user_id uuid,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.shop_this_fit_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all clicks"
  ON public.shop_this_fit_clicks FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role can insert clicks"
  ON public.shop_this_fit_clicks FOR INSERT
  WITH CHECK (true);

CREATE INDEX idx_stf_clicks_post_id ON public.shop_this_fit_clicks(post_id);
CREATE INDEX idx_stf_clicks_created_at ON public.shop_this_fit_clicks(created_at);
CREATE INDEX idx_stf_clicks_platform ON public.shop_this_fit_clicks(platform);