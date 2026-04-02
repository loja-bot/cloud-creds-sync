
-- Remove sensitive tables from realtime (no IF EXISTS for ALTER PUBLICATION)
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.iptv_credentials;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.app_users;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END $$;

-- Create rate limiting table for API abuse prevention
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL,
  action text NOT NULL,
  attempt_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service can manage rate limits"
ON public.rate_limits
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_rate_limits_lookup ON public.rate_limits(identifier, action, attempt_at);

CREATE OR REPLACE FUNCTION public.cleanup_rate_limits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.rate_limits WHERE attempt_at < now() - interval '1 hour';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_cleanup_rate_limits ON public.rate_limits;
CREATE TRIGGER trigger_cleanup_rate_limits
AFTER INSERT ON public.rate_limits
FOR EACH STATEMENT
EXECUTE FUNCTION public.cleanup_rate_limits();
