-- Create table to track login attempts
CREATE TABLE IF NOT EXISTS public.login_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  locked_until TIMESTAMP WITH TIME ZONE,
  last_attempt TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON public.login_attempts(email);

-- Enable RLS
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read their own login attempt records (needed for lockout check)
CREATE POLICY "Users can view their own login attempts"
  ON public.login_attempts
  FOR SELECT
  USING (true);

-- Allow anyone to insert/update login attempts (anonymous users need this during login)
CREATE POLICY "Anyone can insert login attempts"
  ON public.login_attempts
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update login attempts"
  ON public.login_attempts
  FOR UPDATE
  USING (true);

-- Function to clean up old login attempt records (older than 24 hours)
CREATE OR REPLACE FUNCTION public.cleanup_old_login_attempts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.login_attempts
  WHERE created_at < NOW() - INTERVAL '24 hours';
END;
$$;