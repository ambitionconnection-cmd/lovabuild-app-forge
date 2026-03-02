
-- Create shared_routes table for shareable route links
CREATE TABLE public.shared_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  stops jsonb NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create index on code for fast lookups
CREATE INDEX idx_shared_routes_code ON public.shared_routes(code);

-- Enable RLS
ALTER TABLE public.shared_routes ENABLE ROW LEVEL SECURITY;

-- Anyone can view shared routes (public links)
CREATE POLICY "Anyone can view shared routes"
  ON public.shared_routes FOR SELECT
  USING (true);

-- Anyone can create shared routes (even non-logged-in users)
CREATE POLICY "Anyone can create shared routes"
  ON public.shared_routes FOR INSERT
  WITH CHECK (true);
