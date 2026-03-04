
-- Step 2a: Add is_founding_member column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_founding_member boolean NOT NULL DEFAULT false;

-- Step 2b: Update handle_new_user() to auto-grant Pro for first 500 users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_count integer;
BEGIN
  SELECT COUNT(*) INTO user_count FROM public.profiles;

  IF user_count < 500 THEN
    INSERT INTO public.profiles (id, display_name, avatar_url, is_pro, pro_expires_at, is_founding_member)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email),
      NEW.raw_user_meta_data->>'avatar_url',
      true,
      NOW() + INTERVAL '3 months',
      true
    );
  ELSE
    INSERT INTO public.profiles (id, display_name, avatar_url)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email),
      NEW.raw_user_meta_data->>'avatar_url'
    );
  END IF;

  RETURN NEW;
END;
$function$;

-- Step 3a: Ambassador codes table
CREATE TABLE IF NOT EXISTS public.ambassador_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  pro_duration_days integer DEFAULT NULL,
  max_uses integer NOT NULL DEFAULT 1,
  uses_count integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ambassador_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage ambassador codes"
ON public.ambassador_codes FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can view active codes for redemption"
ON public.ambassador_codes FOR SELECT
TO authenticated
USING (is_active = true AND uses_count < max_uses);

-- Step 3b: Code redemptions table
CREATE TABLE IF NOT EXISTS public.code_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code_id uuid NOT NULL REFERENCES public.ambassador_codes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  redeemed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(code_id, user_id)
);

ALTER TABLE public.code_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own redemptions"
ON public.code_redemptions FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can redeem codes"
ON public.code_redemptions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all redemptions"
ON public.code_redemptions FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));
