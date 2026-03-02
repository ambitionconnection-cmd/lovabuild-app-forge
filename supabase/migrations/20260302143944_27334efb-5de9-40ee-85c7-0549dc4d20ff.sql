
-- Add status, style_tags, is_sponsored columns to street_spotted_posts
ALTER TABLE public.street_spotted_posts 
  ADD COLUMN status text NOT NULL DEFAULT 'pending',
  ADD COLUMN style_tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN is_sponsored boolean NOT NULL DEFAULT false;

-- Add affiliate_url to brands
ALTER TABLE public.brands
  ADD COLUMN affiliate_url text;

-- Allow admins to UPDATE street_spotted_posts (for moderation)
CREATE POLICY "Admins can update any post"
  ON public.street_spotted_posts
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Drop existing public SELECT policy and replace with status-aware one
DROP POLICY IF EXISTS "Anyone can view posts" ON public.street_spotted_posts;

CREATE POLICY "Anyone can view approved posts"
  ON public.street_spotted_posts
  FOR SELECT
  USING (status = 'approved' OR user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Mark all existing posts as approved so they remain visible
UPDATE public.street_spotted_posts SET status = 'approved' WHERE status = 'pending';
