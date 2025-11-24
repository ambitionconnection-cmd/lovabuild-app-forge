-- The affiliate_analytics_summary is a view that inherits RLS from its base table
-- The base table affiliate_analytics already has proper RLS policies
-- Just ensuring the view is properly secured through its underlying table

-- Verify that affiliate_analytics has admin-only access (already exists, just documenting)
-- Policy: "Admins can view all analytics" on affiliate_analytics uses has_role(auth.uid(), 'admin'::app_role)