-- Create email_analytics table to track email opens and clicks
CREATE TABLE public.email_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email_type TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('open', 'click')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Index for querying analytics
  CONSTRAINT valid_email_type CHECK (email_type IN ('weekly_digest', 'drop_reminder', 'security_alert', 'other'))
);

-- Create indexes for better query performance
CREATE INDEX idx_email_analytics_user_id ON public.email_analytics(user_id);
CREATE INDEX idx_email_analytics_created_at ON public.email_analytics(created_at);
CREATE INDEX idx_email_analytics_email_type ON public.email_analytics(email_type);
CREATE INDEX idx_email_analytics_event_type ON public.email_analytics(event_type);

-- Enable RLS
ALTER TABLE public.email_analytics ENABLE ROW LEVEL SECURITY;

-- Policy for service role to insert analytics
CREATE POLICY "Service role can insert analytics" 
ON public.email_analytics 
FOR INSERT 
WITH CHECK (true);

-- Policy for admins to view analytics
CREATE POLICY "Admins can view all analytics" 
ON public.email_analytics 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Policy for users to view their own analytics
CREATE POLICY "Users can view their own analytics" 
ON public.email_analytics 
FOR SELECT 
USING (auth.uid() = user_id);

COMMENT ON TABLE public.email_analytics IS 'Tracks email open rates and click-through rates for digest and notification emails';