-- Fix security definer view by recreating with SECURITY INVOKER
DROP VIEW IF EXISTS public.affiliate_analytics_summary;

CREATE OR REPLACE VIEW public.affiliate_analytics_summary 
WITH (security_invoker = true)
AS
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