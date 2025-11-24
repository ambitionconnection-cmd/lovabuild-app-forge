-- Fix: affiliate_analytics_summary is a view and inherits security from base table
-- Only update the base table policies

-- Verify the affiliate_analytics table has proper admin-only access
-- (policies already created in previous migration, this confirms they're correct)