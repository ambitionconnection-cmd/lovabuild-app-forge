-- Fix security_audit_log INSERT policy - restrict to service_role only
DROP POLICY IF EXISTS "Service role can insert audit logs" ON public.security_audit_log;
CREATE POLICY "Service role can insert audit logs"
ON public.security_audit_log
FOR INSERT
TO service_role
WITH CHECK (true);

-- Fix email_analytics INSERT policy - restrict to service_role only
DROP POLICY IF EXISTS "Service role can insert analytics" ON public.email_analytics;
CREATE POLICY "Service role can insert analytics"
ON public.email_analytics
FOR INSERT
TO service_role
WITH CHECK (true);

-- Fix notification_history INSERT policy - already created for service_role, verify it's correct
DROP POLICY IF EXISTS "Service role can insert notifications" ON public.notification_history;
CREATE POLICY "Service role can insert notifications"
ON public.notification_history
FOR INSERT
TO service_role
WITH CHECK (true);

-- Fix affiliate_analytics INSERT policy - restrict to service_role only
DROP POLICY IF EXISTS "Service role can insert analytics" ON public.affiliate_analytics;
CREATE POLICY "Service role can insert analytics"
ON public.affiliate_analytics
FOR INSERT
TO service_role
WITH CHECK (true);

-- Fix ip_login_attempts - restrict INSERT/UPDATE to service_role
DROP POLICY IF EXISTS "Service role can insert IP attempts" ON public.ip_login_attempts;
DROP POLICY IF EXISTS "Service role can update IP attempts" ON public.ip_login_attempts;
CREATE POLICY "Service role can insert IP attempts"
ON public.ip_login_attempts
FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "Service role can update IP attempts"
ON public.ip_login_attempts
FOR UPDATE
TO service_role
USING (true);