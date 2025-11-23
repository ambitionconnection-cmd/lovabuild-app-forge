-- Create IP-based login attempts tracking table
CREATE TABLE IF NOT EXISTS public.ip_login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_attempt TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  locked_until TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create index for faster IP lookups
CREATE INDEX IF NOT EXISTS idx_ip_login_attempts_ip ON public.ip_login_attempts(ip_address);

-- Enable RLS (only service role will access this)
ALTER TABLE public.ip_login_attempts ENABLE ROW LEVEL SECURITY;

-- Function to cleanup old IP attempts (run daily)
CREATE OR REPLACE FUNCTION public.cleanup_old_ip_attempts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.ip_login_attempts
  WHERE created_at < NOW() - INTERVAL '7 days'
    AND (locked_until IS NULL OR locked_until < NOW());
END;
$$;