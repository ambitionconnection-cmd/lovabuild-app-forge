-- Allow public access to shops via the shops_public view by granting SELECT on active shops
-- This uses SECURITY INVOKER so it respects the view's column restrictions

-- Add policy for public/anonymous users to view active shops through the view
CREATE POLICY "Anyone can view active shops via public view"
ON public.shops
FOR SELECT
TO anon, authenticated
USING (is_active = true);

-- Add service role INSERT/UPDATE for ip_login_attempts (rate limiting)
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

-- Add service role INSERT for notification_history
CREATE POLICY "Service role can insert notifications"
ON public.notification_history
FOR INSERT
TO service_role
WITH CHECK (true);