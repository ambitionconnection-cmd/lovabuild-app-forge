-- Drop and recreate the view with security_invoker = true
-- This ensures the view respects RLS policies on underlying tables
DROP VIEW IF EXISTS public.affiliate_analytics_summary;

CREATE VIEW public.affiliate_analytics_summary
WITH (security_invoker = true)
AS
SELECT 
    d.id AS drop_id,
    d.title AS drop_title,
    count(CASE WHEN aa.event_type = 'affiliate_click' THEN 1 ELSE NULL END) AS affiliate_clicks,
    count(CASE WHEN aa.event_type = 'discount_code_copy' THEN 1 ELSE NULL END) AS discount_code_copies,
    count(*) AS total_events,
    max(aa.created_at) AS last_event_at
FROM drops d
LEFT JOIN affiliate_analytics aa ON d.id = aa.drop_id
GROUP BY d.id, d.title;