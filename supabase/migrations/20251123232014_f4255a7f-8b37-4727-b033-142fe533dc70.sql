-- Create table for tracking affiliate and discount code analytics
CREATE TABLE IF NOT EXISTS public.affiliate_analytics (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  drop_id uuid NOT NULL REFERENCES public.drops(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type text NOT NULL, -- 'affiliate_click' or 'discount_code_copy'
  ip_address text,
  user_agent text,
  referrer text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.affiliate_analytics ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert analytics (public tracking)
CREATE POLICY "Anyone can insert analytics"
ON public.affiliate_analytics
FOR INSERT
TO public
WITH CHECK (true);

-- Admins can view all analytics
CREATE POLICY "Admins can view all analytics"
ON public.affiliate_analytics
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for better query performance
CREATE INDEX idx_affiliate_analytics_drop_id ON public.affiliate_analytics(drop_id);
CREATE INDEX idx_affiliate_analytics_event_type ON public.affiliate_analytics(event_type);
CREATE INDEX idx_affiliate_analytics_created_at ON public.affiliate_analytics(created_at DESC);

-- Create view for analytics summary
CREATE OR REPLACE VIEW public.affiliate_analytics_summary AS
SELECT 
  d.id as drop_id,
  d.title as drop_title,
  COUNT(CASE WHEN aa.event_type = 'affiliate_click' THEN 1 END) as affiliate_clicks,
  COUNT(CASE WHEN aa.event_type = 'discount_code_copy' THEN 1 END) as discount_code_copies,
  COUNT(*) as total_events,
  MAX(aa.created_at) as last_event_at
FROM public.drops d
LEFT JOIN public.affiliate_analytics aa ON d.id = aa.drop_id
GROUP BY d.id, d.title;