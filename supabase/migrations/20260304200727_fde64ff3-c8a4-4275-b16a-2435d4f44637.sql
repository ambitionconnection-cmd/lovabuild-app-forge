
CREATE TABLE public.admin_notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  notify_contact_messages boolean NOT NULL DEFAULT true,
  notify_pending_posts boolean NOT NULL DEFAULT true,
  notify_brand_requests boolean NOT NULL DEFAULT true,
  notify_new_signups boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (admin_id)
);

ALTER TABLE public.admin_notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage own notification preferences"
  ON public.admin_notification_preferences FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) AND auth.uid() = admin_id)
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND auth.uid() = admin_id);
