-- Create audit log table
CREATE TABLE public.security_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,
  ip_address TEXT,
  event_data JSONB,
  performed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX idx_security_audit_log_created_at ON public.security_audit_log(created_at DESC);
CREATE INDEX idx_security_audit_log_event_type ON public.security_audit_log(event_type);
CREATE INDEX idx_security_audit_log_user_id ON public.security_audit_log(user_id);

-- Enable RLS
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view all logs
CREATE POLICY "Admins can view all audit logs"
ON public.security_audit_log
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Policy: System can insert logs (service role)
CREATE POLICY "Service role can insert audit logs"
ON public.security_audit_log
FOR INSERT
TO service_role
WITH CHECK (true);