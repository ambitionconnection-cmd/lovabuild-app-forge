-- Create contact_submissions table
CREATE TABLE public.contact_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT,
  message TEXT NOT NULL,
  inquiry_type TEXT NOT NULL,
  is_resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert contact submissions (public form)
CREATE POLICY "Anyone can submit contact forms"
ON public.contact_submissions
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Only admins can view contact submissions
CREATE POLICY "Admins can view all submissions"
ON public.contact_submissions
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Only admins can update contact submissions (mark as resolved)
CREATE POLICY "Admins can update submissions"
ON public.contact_submissions
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Add trigger for updated_at
CREATE TRIGGER update_contact_submissions_updated_at
BEFORE UPDATE ON public.contact_submissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_contact_submissions_created_at ON public.contact_submissions(created_at DESC);
CREATE INDEX idx_contact_submissions_is_resolved ON public.contact_submissions(is_resolved);