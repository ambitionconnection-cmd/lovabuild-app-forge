-- Create table for scheduled audit log exports
CREATE TABLE public.scheduled_audit_exports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL,
  admin_email TEXT NOT NULL,
  schedule_type TEXT NOT NULL CHECK (schedule_type IN ('daily', 'weekly')),
  export_format TEXT NOT NULL CHECK (export_format IN ('csv', 'json')),
  filters JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  last_run_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.scheduled_audit_exports ENABLE ROW LEVEL SECURITY;

-- Admins can view all scheduled exports
CREATE POLICY "Admins can view scheduled exports"
ON public.scheduled_audit_exports
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can create scheduled exports
CREATE POLICY "Admins can create scheduled exports"
ON public.scheduled_audit_exports
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND auth.uid() = admin_id);

-- Admins can update their own scheduled exports
CREATE POLICY "Admins can update own scheduled exports"
ON public.scheduled_audit_exports
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role) AND auth.uid() = admin_id);

-- Admins can delete their own scheduled exports
CREATE POLICY "Admins can delete own scheduled exports"
ON public.scheduled_audit_exports
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role) AND auth.uid() = admin_id);

-- Trigger to update updated_at
CREATE TRIGGER update_scheduled_audit_exports_updated_at
BEFORE UPDATE ON public.scheduled_audit_exports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable pg_cron and pg_net extensions for scheduled tasks
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;