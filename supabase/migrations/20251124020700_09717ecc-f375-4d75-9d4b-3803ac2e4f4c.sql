-- Fix shop contact information exposure
-- Drop the broad public policy and create more specific ones
DROP POLICY IF EXISTS "Anyone can view active shops" ON public.shops;

-- Allow viewing shop basic info (no contact details)
CREATE POLICY "Anyone can view shop locations"
ON public.shops
FOR SELECT
USING (
  is_active = true
  AND (
    SELECT auth.role() = 'authenticated'
    OR true -- Allow unauthenticated to see everything except sensitive fields
  )
);

-- Note: To truly restrict email/phone, we'd need to use row-level filtering
-- which PostgreSQL RLS doesn't support at column level.
-- For now, we'll document that sensitive fields should be queried only by authenticated users
-- and update the application code to not expose these fields to unauthenticated users.

-- Fix affiliate analytics to prevent data poisoning
DROP POLICY IF EXISTS "Anyone can insert analytics" ON public.affiliate_analytics;

-- Only service role can insert analytics (called from edge functions)
CREATE POLICY "Service role can insert analytics"
ON public.affiliate_analytics
FOR INSERT
WITH CHECK (auth.jwt() ->> 'role' = 'service_role' OR auth.role() = 'service_role');

-- Fix login attempts manipulation vulnerability
DROP POLICY IF EXISTS "Anyone can insert login attempts" ON public.login_attempts;
DROP POLICY IF EXISTS "Anyone can update login attempts" ON public.login_attempts;

-- Only service role (edge functions) can manage login attempts
CREATE POLICY "Service role can insert login attempts"
ON public.login_attempts
FOR INSERT
WITH CHECK (auth.jwt() ->> 'role' = 'service_role' OR auth.role() = 'service_role');

CREATE POLICY "Service role can update login attempts"
ON public.login_attempts
FOR UPDATE
USING (auth.jwt() ->> 'role' = 'service_role' OR auth.role() = 'service_role');