
-- visitor_sessions table
CREATE TABLE public.visitor_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id text NOT NULL UNIQUE,
  first_seen timestamptz NOT NULL DEFAULT now(),
  last_seen timestamptz NOT NULL DEFAULT now(),
  page_count integer NOT NULL DEFAULT 0,
  device_type text,
  browser text,
  country text,
  referrer text,
  user_id uuid,
  is_authenticated boolean NOT NULL DEFAULT false
);

ALTER TABLE public.visitor_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert sessions"
  ON public.visitor_sessions FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update sessions"
  ON public.visitor_sessions FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins can view all sessions"
  ON public.visitor_sessions FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_visitor_sessions_first_seen ON public.visitor_sessions (first_seen);
CREATE INDEX idx_visitor_sessions_last_seen ON public.visitor_sessions (last_seen);

-- page_views table
CREATE TABLE public.page_views (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id text NOT NULL,
  page_name text NOT NULL,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  is_authenticated boolean NOT NULL DEFAULT false,
  user_id uuid
);

ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert page views"
  ON public.page_views FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can view all page views"
  ON public.page_views FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_page_views_viewed_at ON public.page_views (viewed_at);
CREATE INDEX idx_page_views_session_id ON public.page_views (session_id);
CREATE INDEX idx_page_views_page_name ON public.page_views (page_name);

-- app_events table
CREATE TABLE public.app_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id text NOT NULL,
  event_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  is_authenticated boolean NOT NULL DEFAULT false,
  user_id uuid,
  metadata jsonb DEFAULT '{}'::jsonb
);

ALTER TABLE public.app_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert events"
  ON public.app_events FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can view all events"
  ON public.app_events FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_app_events_created_at ON public.app_events (created_at);
CREATE INDEX idx_app_events_session_id ON public.app_events (session_id);
CREATE INDEX idx_app_events_event_name ON public.app_events (event_name);
