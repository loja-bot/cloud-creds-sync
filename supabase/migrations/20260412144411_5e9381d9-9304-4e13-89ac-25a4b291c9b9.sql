
-- 1. Cleanup: delete unconfirmed bot accounts from auth.users
-- (accounts with bot_ prefix emails that were never confirmed)
DELETE FROM auth.users 
WHERE email LIKE 'bot_%@gmail.com' 
AND email_confirmed_at IS NULL;

-- Also clean up any orphaned app_users from deleted auth users
DELETE FROM public.app_users 
WHERE email LIKE 'bot_%@gmail.com' 
AND user_id NOT IN (SELECT id FROM auth.users);

-- 2. Create signup rate limit tracking table
CREATE TABLE IF NOT EXISTS public.signup_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address text NOT NULL,
  email_domain text NOT NULL,
  attempted_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.signup_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only service role can manage signup rate limits"
  ON public.signup_rate_limits
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Index for fast lookups
CREATE INDEX idx_signup_rate_ip ON public.signup_rate_limits (ip_address, attempted_at);
CREATE INDEX idx_signup_rate_domain ON public.signup_rate_limits (email_domain, attempted_at);

-- 3. Auto-cleanup old signup rate limit entries (older than 24h)
CREATE OR REPLACE FUNCTION public.cleanup_signup_rate_limits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.signup_rate_limits WHERE attempted_at < now() - interval '24 hours';
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_cleanup_signup_rates
  AFTER INSERT ON public.signup_rate_limits
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.cleanup_signup_rate_limits();

-- 4. Tighten share_tokens - drop old INSERT policy and recreate with stricter checks
DROP POLICY IF EXISTS "Authenticated can create tokens" ON public.share_tokens;

CREATE POLICY "Authenticated can create tokens with valid data"
  ON public.share_tokens
  FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND stream_url IS NOT NULL 
    AND length(stream_url) > 0
    AND stream_title IS NOT NULL
    AND length(stream_title) > 0
    AND length(stream_title) <= 500
    AND stream_id > 0
  );
