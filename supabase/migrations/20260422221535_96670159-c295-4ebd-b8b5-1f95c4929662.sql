-- ============================================================
-- PROMOTERS
-- ============================================================
CREATE TABLE public.promoters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL UNIQUE,
  city text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz
);

CREATE INDEX idx_promoters_code ON public.promoters(lower(code));

ALTER TABLE public.promoters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage promoters"
  ON public.promoters FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Public can read minimal promoter info (needed for /ref and /results pages)
CREATE POLICY "Public can read active promoters"
  ON public.promoters FOR SELECT
  TO anon, authenticated
  USING (active = true);

-- ============================================================
-- PROMOTER CAMPAIGNS
-- ============================================================
CREATE TABLE public.promoter_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promoter_id uuid NOT NULL REFERENCES public.promoters(id) ON DELETE CASCADE,
  city text NOT NULL,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  target_visits integer NOT NULL DEFAULT 200,
  target_signins integer NOT NULL DEFAULT 100,
  rate_visit numeric(10,2) NOT NULL DEFAULT 0.50,
  rate_signin numeric(10,2) NOT NULL DEFAULT 1.00,
  rate_post_signin numeric(10,2) NOT NULL DEFAULT 0.20,
  daily_cap numeric(10,2) NOT NULL DEFAULT 20.00,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','paused')),
  total_payout numeric(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_campaigns_promoter ON public.promoter_campaigns(promoter_id);
CREATE INDEX idx_campaigns_status ON public.promoter_campaigns(status);

ALTER TABLE public.promoter_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage campaigns"
  ON public.promoter_campaigns FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Public can read active campaign info (needed for /results page)
CREATE POLICY "Public can read campaign basics"
  ON public.promoter_campaigns FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE TRIGGER update_promoter_campaigns_updated_at
  BEFORE UPDATE ON public.promoter_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- PROMOTER VISITS
-- ============================================================
CREATE TABLE public.promoter_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promoter_id uuid NOT NULL REFERENCES public.promoters(id) ON DELETE CASCADE,
  session_id text NOT NULL,
  ip_hash text,
  visited_at timestamptz NOT NULL DEFAULT now(),
  qualified boolean NOT NULL DEFAULT false,
  signed_in boolean NOT NULL DEFAULT false,
  user_id uuid,
  signed_in_at timestamptz,
  post_campaign boolean NOT NULL DEFAULT false,
  capped boolean NOT NULL DEFAULT false,
  duplicate boolean NOT NULL DEFAULT false
);

CREATE INDEX idx_visits_promoter ON public.promoter_visits(promoter_id);
CREATE INDEX idx_visits_session ON public.promoter_visits(promoter_id, session_id);
CREATE INDEX idx_visits_iphash ON public.promoter_visits(promoter_id, ip_hash) WHERE ip_hash IS NOT NULL;
CREATE INDEX idx_visits_visited_at ON public.promoter_visits(visited_at);
CREATE INDEX idx_visits_user ON public.promoter_visits(user_id) WHERE user_id IS NOT NULL;

ALTER TABLE public.promoter_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view all visits"
  ON public.promoter_visits FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can insert visits"
  ON public.promoter_visits FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update visits"
  ON public.promoter_visits FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- TRIGGERS / LOGIC
-- ============================================================

-- 1. Compute the current payout for a campaign
CREATE OR REPLACE FUNCTION public.recalc_campaign_payout(_promoter_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total numeric(10,2);
BEGIN
  SELECT
    COALESCE(SUM(
      CASE WHEN v.qualified AND NOT v.capped AND NOT v.duplicate THEN c.rate_visit ELSE 0 END
      + CASE WHEN v.signed_in AND NOT v.post_campaign AND NOT v.capped AND NOT v.duplicate THEN c.rate_signin ELSE 0 END
      + CASE WHEN v.signed_in AND v.post_campaign AND NOT v.duplicate THEN c.rate_post_signin ELSE 0 END
    ), 0)
  INTO v_total
  FROM promoter_visits v
  JOIN promoter_campaigns c ON c.promoter_id = v.promoter_id
  WHERE v.promoter_id = _promoter_id
    AND c.status IN ('active','completed','paused');

  UPDATE promoter_campaigns
  SET total_payout = v_total, updated_at = now()
  WHERE promoter_id = _promoter_id;
END;
$$;

-- 2. Compute today's earnings for a promoter (used by daily-cap check)
CREATE OR REPLACE FUNCTION public.promoter_earnings_today(_promoter_id uuid)
RETURNS numeric
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(
    CASE WHEN v.qualified AND NOT v.capped AND NOT v.duplicate THEN c.rate_visit ELSE 0 END
    + CASE WHEN v.signed_in AND NOT v.post_campaign AND NOT v.capped AND NOT v.duplicate THEN c.rate_signin ELSE 0 END
    + CASE WHEN v.signed_in AND v.post_campaign AND NOT v.duplicate THEN c.rate_post_signin ELSE 0 END
  ), 0)
  FROM promoter_visits v
  JOIN promoter_campaigns c ON c.promoter_id = v.promoter_id
  WHERE v.promoter_id = _promoter_id
    AND v.visited_at >= date_trunc('day', now())
    AND v.visited_at < date_trunc('day', now()) + interval '1 day';
$$;

-- 3. Trigger: enforce daily cap + first-promoter-wins + recalc payout
CREATE OR REPLACE FUNCTION public.handle_promoter_visit_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cap numeric(10,2);
  v_today numeric(10,2);
  v_existing_promoter uuid;
BEGIN
  -- First promoter wins: if this user was already credited to another promoter, mark this row duplicate
  IF NEW.user_id IS NOT NULL AND NEW.signed_in = true THEN
    SELECT promoter_id INTO v_existing_promoter
    FROM promoter_visits
    WHERE user_id = NEW.user_id
      AND signed_in = true
      AND id <> NEW.id
      AND promoter_id <> NEW.promoter_id
    ORDER BY signed_in_at ASC
    LIMIT 1;

    IF v_existing_promoter IS NOT NULL THEN
      NEW.duplicate := true;
    END IF;
  END IF;

  -- Daily cap check: if today's earnings already at/above cap, mark this visit capped
  SELECT daily_cap INTO v_cap
  FROM promoter_campaigns
  WHERE promoter_id = NEW.promoter_id
  ORDER BY start_date DESC
  LIMIT 1;

  IF v_cap IS NOT NULL THEN
    v_today := promoter_earnings_today(NEW.promoter_id);
    IF v_today >= v_cap THEN
      NEW.capped := true;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_promoter_visit_before
  BEFORE INSERT OR UPDATE ON public.promoter_visits
  FOR EACH ROW EXECUTE FUNCTION public.handle_promoter_visit_change();

-- 4. After-trigger: recalc campaign payout
CREATE OR REPLACE FUNCTION public.handle_promoter_visit_after()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM recalc_campaign_payout(COALESCE(NEW.promoter_id, OLD.promoter_id));
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_promoter_visit_after
  AFTER INSERT OR UPDATE OR DELETE ON public.promoter_visits
  FOR EACH ROW EXECUTE FUNCTION public.handle_promoter_visit_after();

-- ============================================================
-- PUBLIC RESULTS FUNCTION (used by /results/[code])
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_promoter_results(_code text)
RETURNS TABLE (
  promoter_name text,
  city text,
  qualified_visits bigint,
  signins bigint,
  target_visits integer,
  target_signins integer,
  earnings_today numeric,
  earnings_total numeric,
  conversion_rate numeric
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_promoter_id uuid;
BEGIN
  SELECT id INTO v_promoter_id FROM promoters WHERE lower(code) = lower(_code) AND active = true;
  IF v_promoter_id IS NULL THEN RETURN; END IF;

  RETURN QUERY
  SELECT
    p.name,
    p.city,
    (SELECT COUNT(*) FROM promoter_visits WHERE promoter_id = v_promoter_id AND qualified = true AND duplicate = false),
    (SELECT COUNT(*) FROM promoter_visits WHERE promoter_id = v_promoter_id AND signed_in = true AND duplicate = false),
    c.target_visits,
    c.target_signins,
    promoter_earnings_today(v_promoter_id),
    c.total_payout,
    CASE
      WHEN (SELECT COUNT(*) FROM promoter_visits WHERE promoter_id = v_promoter_id AND qualified = true AND duplicate = false) = 0 THEN 0
      ELSE ROUND(
        (SELECT COUNT(*)::numeric FROM promoter_visits WHERE promoter_id = v_promoter_id AND signed_in = true AND duplicate = false)
        / (SELECT COUNT(*)::numeric FROM promoter_visits WHERE promoter_id = v_promoter_id AND qualified = true AND duplicate = false)
        * 100, 1)
    END
  FROM promoters p
  LEFT JOIN promoter_campaigns c ON c.promoter_id = p.id
  WHERE p.id = v_promoter_id
  ORDER BY c.start_date DESC NULLS LAST
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_promoter_results(text) TO anon, authenticated;